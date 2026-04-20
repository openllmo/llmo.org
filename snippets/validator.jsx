const SCHEMA_URL = "/spec/v0.1/schema.json";
const SELF_TEST_URL = "/spec/v0.1/test-vectors/signed-strict.json";
const WELL_KNOWN_PATH = "/.well-known/llmo.json";
const JWKS_PATH = "/.well-known/llmo-keys.json";

const ALLOWED_JWS_ALGS = ["ES256", "ES384", "EdDSA"];
const B64URL = /^[A-Za-z0-9_-]+$/;

async function loadAjvDynamic() {
  const [ajvMod, formatsMod] = await Promise.all([
    import(/* webpackIgnore: true */ "https://esm.sh/ajv@8/dist/2020.js"),
    import(/* webpackIgnore: true */ "https://esm.sh/ajv-formats@3"),
  ]);
  return { ajvMod, formatsMod };
}

function loadAjvViaScriptTag() {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("document is not available"));
      return;
    }
    const existing = window.__llmo_validator_ajv;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      (async () => {
        try {
          const [ajvMod, formatsMod] = await Promise.all([
            import("https://esm.sh/ajv@8/dist/2020.js"),
            import("https://esm.sh/ajv-formats@3"),
          ]);
          window.__llmo_validator_ajv = { ajvMod, formatsMod };
          window.dispatchEvent(new CustomEvent("__llmo_validator_ajv_ready"));
        } catch (err) {
          window.__llmo_validator_ajv_err = err;
          window.dispatchEvent(new CustomEvent("__llmo_validator_ajv_failed", { detail: err }));
        }
      })();
    `;
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("__llmo_validator_ajv_ready", onReady);
      window.removeEventListener("__llmo_validator_ajv_failed", onFailed);
      fn(arg);
    };
    const onReady = () => finish(resolve, window.__llmo_validator_ajv);
    const onFailed = (e) =>
      finish(reject, e.detail || new Error("script tag injection failed"));
    window.addEventListener("__llmo_validator_ajv_ready", onReady, { once: true });
    window.addEventListener("__llmo_validator_ajv_failed", onFailed, { once: true });
    document.head.appendChild(script);
    setTimeout(() => finish(reject, new Error("script tag injection timed out after 15s")), 15000);
  });
}

function pickDefault(mod, preferred) {
  if (!mod) return null;
  if (preferred && typeof mod[preferred] === "function") return mod[preferred];
  if (typeof mod.default === "function") return mod.default;
  if (typeof mod === "function") return mod;
  if (mod.default && mod.default.default && typeof mod.default.default === "function") {
    return mod.default.default;
  }
  return null;
}

async function initAjv() {
  const attempts = [];
  let mods;
  try {
    mods = await loadAjvDynamic();
  } catch (err) {
    attempts.push({ path: "dynamic import", err });
    console.warn("[validator] dynamic import failed, trying script tag", err);
    try {
      mods = await loadAjvViaScriptTag();
    } catch (err2) {
      attempts.push({ path: "script tag", err: err2 });
      console.error("[validator] all AJV loading paths failed", attempts);
      const joined = attempts
        .map((a) => `${a.path}: ${a.err && a.err.message ? a.err.message : a.err}`)
        .join("; ");
      throw new Error(`AJV failed to load via any path. ${joined}`);
    }
  }
  const Ajv = pickDefault(mods.ajvMod, "default") || pickDefault(mods.ajvMod, "Ajv2020");
  const addFormats = pickDefault(mods.formatsMod, "default");
  if (!Ajv) throw new Error("AJV module did not expose a callable default export");
  if (!addFormats) throw new Error("ajv-formats module did not expose a callable default export");
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function b64urlDecode(s) {
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = std.length % 4;
  const padded = pad ? std + "=".repeat(4 - pad) : std;
  return atob(padded);
}

function isUriLike(s) {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_err) {
    return false;
  }
}

function isSubdomainOrEqual(host, owned) {
  return host === owned || host.endsWith("." + owned);
}

function collectClaimUrls(claim) {
  const urls = [];
  const { type, statement } = claim;
  if (!statement || typeof statement !== "object") return urls;
  const push = (url, thirdPartyAllowed) => {
    if (isUriLike(url)) urls.push({ url, thirdPartyAllowed });
  };
  if (type === "canonical_urls") {
    for (const v of Object.values(statement)) push(v, false);
  } else if (type === "official_channels") {
    if (statement.community && typeof statement.community === "object") {
      for (const v of Object.values(statement.community)) push(v, true);
    }
  } else if (type === "product_facts") {
    if (Array.isArray(statement.products)) {
      for (const p of statement.products) if (p && p.url) push(p.url, false);
    }
  } else if (type === "personnel") {
    if (Array.isArray(statement.spokespeople)) {
      for (const sp of statement.spokespeople) if (sp && sp.verification) push(sp.verification, false);
    }
  } else if (type === "disavowal") {
    if (Array.isArray(statement.disavowed)) {
      for (const d of statement.disavowed) if (d && d.url) push(d.url, true);
    }
  } else if (type === "supersedes") {
    if (Array.isArray(statement.superseded)) {
      for (const s of statement.superseded) if (s && s.url) push(s.url, true);
    }
  } else if (type === "pointer") {
    if (statement.url) push(statement.url, true);
  }
  return urls;
}

function daysBetween(aIso, bIso) {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function describeJsonParseError(text, err) {
  const msg = (err && err.message) || "parse error";
  const match = /position\s+(\d+)/i.exec(msg);
  let loc = "";
  if (match) {
    const pos = parseInt(match[1], 10);
    const before = text.slice(0, pos);
    const line = (before.match(/\n/g) || []).length + 1;
    const col = pos - (before.lastIndexOf("\n") + 1) + 1;
    const bad = text.charAt(pos) || "(end of input)";
    loc = ` at line ${line}, column ${col} (character ${pos}, \"${bad}\")`;
  }
  return (
    `The input could not be parsed as JSON.\n` +
    `Parse error${loc}: ${msg}.\n` +
    `Verify that your llmo.json is syntactically valid JSON. You can validate JSON syntax independently at jsonlint.com or with \`jq . < your-file.json\` on the command line.`
  );
}

function check(id, section, desc, status, note) {
  return { id, section, desc, status, note: note || null };
}

function evaluate(doc, schemaOk, schemaErrors, urlContext) {
  const claims = Array.isArray(doc.claims) ? doc.claims : [];
  const entity = doc.entity && typeof doc.entity === "object" ? doc.entity : {};
  const ownedDomains = [entity.primary_domain, ...(Array.isArray(entity.aliases) ? entity.aliases : [])]
    .filter((d) => typeof d === "string")
    .map((d) => d.toLowerCase());

  const minimal = [];
  if (urlContext) {
    const expected = `https://${urlContext.primaryDomainHost}${WELL_KNOWN_PATH}`;
    const ok = urlContext.fetchedUrl === expected;
    minimal.push(
      check(
        "M1",
        "§5.1",
        "served at /.well-known/llmo.json over HTTPS",
        ok ? "PASS" : "FAIL",
        ok ? null : `fetched URL was ${urlContext.fetchedUrl}, expected ${expected}`,
      ),
    );
  } else {
    minimal.push(
      check("M1", "§5.1", "served at /.well-known/llmo.json over HTTPS", "SKIP", "skipped in paste mode (cannot verify serving path)"),
    );
  }
  minimal.push(check("M2", "§5.1", "document parses as valid JSON", "PASS"));
  minimal.push(
    check(
      "M3",
      "§5.1, §3.1",
      "required top-level fields present and structurally valid against /spec/v0.1/schema.json",
      schemaOk ? "PASS" : "FAIL",
      schemaOk ? null : `${schemaErrors.length} schema violation(s); see schema errors below`,
    ),
  );
  const m4ok = doc.llmo_version === "0.1";
  minimal.push(
    check(
      "M4",
      "§5.1",
      'llmo_version is "0.1"',
      m4ok ? "PASS" : "FAIL",
      m4ok ? null : `llmo_version was ${JSON.stringify(doc.llmo_version)}`,
    ),
  );
  let m5ok = false;
  let m5note = null;
  const days = daysBetween(doc.valid_from, doc.valid_until);
  if (typeof doc.valid_from !== "string" || typeof doc.valid_until !== "string") {
    m5note = "valid_from or valid_until missing or not a string";
  } else if (days === null) {
    m5note = "valid_from or valid_until is not a parseable RFC 3339 timestamp";
  } else if (Date.parse(doc.valid_from) >= Date.parse(doc.valid_until)) {
    m5note = "valid_from does not precede valid_until";
  } else if (days > 365) {
    m5note = `validity window is ${days} days, exceeds 365`;
  } else {
    m5ok = true;
  }
  minimal.push(
    check(
      "M5",
      "§5.1, §3.3",
      "validity window is <= 365 days and valid_from precedes valid_until",
      m5ok ? "PASS" : "FAIL",
      m5note,
    ),
  );
  const m6ok =
    claims.length === 0 ||
    claims.every(
      (c) =>
        c &&
        typeof c === "object" &&
        typeof c.type === "string" &&
        c.statement &&
        typeof c.statement === "object",
    );
  minimal.push(
    check(
      "M6",
      "§5.1",
      "all claims have type and statement",
      m6ok ? "PASS" : "FAIL",
      m6ok ? null : "one or more claims is missing type or statement",
    ),
  );

  const minimalOk = minimal.every((c) => c.status === "PASS" || c.status === "SKIP");

  const standard = [];
  let standardOk = false;
  if (minimalOk) {
    const canonicalClaims = claims.filter((c) => c.type === "canonical_urls");
    const officialChannelsClaims = claims.filter((c) => c.type === "official_channels");
    standard.push(
      check(
        "S1",
        "§5.2",
        "at least one canonical_urls claim",
        canonicalClaims.length >= 1 ? "PASS" : "FAIL",
        canonicalClaims.length === 0 ? "no canonical_urls claim found" : null,
      ),
    );
    standard.push(
      check(
        "S2",
        "§5.2",
        "at least one official_channels claim",
        officialChannelsClaims.length >= 1 ? "PASS" : "FAIL",
        officialChannelsClaims.length === 0 ? "no official_channels claim found" : null,
      ),
    );
    if (urlContext) {
      const primary = typeof entity.primary_domain === "string" ? entity.primary_domain.toLowerCase() : "";
      const ok = primary === urlContext.primaryDomainHost.toLowerCase();
      standard.push(
        check(
          "S3",
          "§5.2",
          "entity.primary_domain matches serving domain",
          ok ? "PASS" : "FAIL",
          ok ? null : `entity.primary_domain is "${primary}" but document served from "${urlContext.primaryDomainHost}"`,
        ),
      );
    } else {
      standard.push(
        check("S3", "§5.2", "entity.primary_domain matches serving domain", "SKIP", "skipped in paste mode (no serving domain to compare)"),
      );
    }
    const urlIssues = [];
    claims.forEach((c, i) => {
      for (const { url, thirdPartyAllowed } of collectClaimUrls(c)) {
        if (thirdPartyAllowed) continue;
        try {
          const host = new URL(url).hostname.toLowerCase();
          const owned = ownedDomains.some((d) => isSubdomainOrEqual(host, d));
          if (!owned) {
            urlIssues.push(`claim[${i}] (${c.type}): ${url} resolves to ${host}, not in owned set {${ownedDomains.join(", ") || "empty"}}`);
          }
        } catch (_err) {
          urlIssues.push(`claim[${i}] (${c.type}): ${url} is not a parseable URL`);
        }
      }
    });
    standard.push(
      check(
        "S4",
        "§5.2",
        "all claim URLs resolve to owned domain or are explicit third-party pointers",
        urlIssues.length === 0 ? "PASS" : "FAIL",
        urlIssues.length === 0 ? null : urlIssues.join("; "),
      ),
    );
    if (days !== null && m5ok) {
      const ok = days <= 180;
      standard.push(
        check(
          "S5",
          "§5.2",
          "validity window is <= 180 days",
          ok ? "PASS" : "FAIL",
          ok ? null : `validity window is ${days} days, exceeds 180`,
        ),
      );
    } else {
      standard.push(check("S5", "§5.2", "validity window is <= 180 days", "FAIL", "validity window unparseable"));
    }
    standardOk = standard.every((c) => c.status === "PASS" || c.status === "SKIP");
  }

  const strict = [];
  let tier = "none";
  let tierBadge = { label: "None", variant: "red" };
  if (schemaOk && minimalOk && !standardOk) {
    tier = "minimal";
    tierBadge = { label: "Minimal", variant: "green" };
  } else if (schemaOk && minimalOk && standardOk) {
    let x1ok = false;
    let x1note = null;
    const sig = doc.signature;
    if (!sig || typeof sig !== "object") {
      x1note = "document-level signature field is absent";
    } else {
      const keys = Object.keys(sig).sort().join(",");
      if (keys !== "protected,signature") {
        x1note = `signature object has unexpected keys: ${keys}`;
      } else if (typeof sig.protected !== "string" || typeof sig.signature !== "string") {
        x1note = "signature.protected or signature.signature is not a string";
      } else if (!B64URL.test(sig.protected) || !B64URL.test(sig.signature)) {
        x1note = "signature.protected or signature.signature is not base64url";
      } else {
        try {
          const header = JSON.parse(b64urlDecode(sig.protected));
          if (!ALLOWED_JWS_ALGS.includes(header.alg)) {
            x1note = `JWS protected header alg is ${JSON.stringify(header.alg)}, must be ES256, ES384, or EdDSA`;
          } else if (!header.kid) {
            x1note = "JWS protected header is missing kid";
          } else {
            x1ok = true;
          }
        } catch (_err) {
          x1note = "JWS protected header does not decode to valid JSON";
        }
      }
    }
    strict.push(
      check(
        "X1",
        "§5.3, §4.3",
        "document-level signature field is present and structurally valid (not cryptographically verified)",
        x1ok ? "PASS" : "FAIL",
        x1note,
      ),
    );
    let x4ok = false;
    for (const c of claims.filter((c) => c.type === "canonical_urls")) {
      if (!c.statement || typeof c.statement !== "object") continue;
      for (const v of Object.values(c.statement)) {
        if (!isUriLike(v)) continue;
        const host = new URL(v).hostname.toLowerCase();
        if (ownedDomains.some((d) => isSubdomainOrEqual(host, d))) {
          x4ok = true;
          break;
        }
      }
      if (x4ok) break;
    }
    strict.push(
      check(
        "X4",
        "§5.3",
        "at least one canonical_urls claim has a URL on the entity's owned domain",
        x4ok ? "PASS" : "FAIL",
        x4ok ? null : "no canonical_urls URL matches primary_domain or aliases",
      ),
    );
    const docInternalOk = x1ok && x4ok;
    if (urlContext) {
      strict.push({ id: "X2", section: "§5.3", desc: "JWKS retrievable at /.well-known/llmo-keys.json", status: "DEFERRED", note: null });
      strict.push({ id: "X3", section: "§5.3", desc: "JWKS Cache-Control max-age is <= 86400", status: "DEFERRED", note: null });
    } else {
      strict.push(check("X2", "§5.3", "JWKS retrievable at /.well-known/llmo-keys.json", "SKIP", "skipped in paste mode (use URL mode to fetch JWKS)"));
      strict.push(check("X3", "§5.3", "JWKS Cache-Control max-age is <= 86400", "SKIP", "skipped in paste mode"));
    }
    if (docInternalOk) {
      if (urlContext) {
        tier = "strict-pending-jwks";
        tierBadge = { label: "Strict (evaluating JWKS)", variant: "amber" };
      } else {
        tier = "strict-paste";
        tierBadge = { label: "Strict (partial, paste mode)", variant: "amber" };
      }
    } else {
      tier = "standard";
      tierBadge = { label: "Standard", variant: "green" };
    }
  }

  const warnings = [];
  if (schemaOk && m5ok && days !== null && days > 180 && days <= 365) {
    warnings.push({
      id: "W1",
      section: "§5.4",
      desc: `validity window is ${days} days, exceeds the 180-day Standard-tier threshold (conformant but discouraged)`,
    });
  }
  claims.forEach((c, i) => {
    if (c.type !== "personnel") return;
    const spokes = c.statement && Array.isArray(c.statement.spokespeople) ? c.statement.spokespeople : [];
    spokes.forEach((sp) => {
      if (!sp || !sp.verification) {
        warnings.push({
          id: "W2",
          section: "§5.4",
          desc: `personnel spokesperson "${sp && sp.name ? sp.name : "(unnamed)"}" in claim[${i}] has no verification URL`,
        });
      }
    });
  });

  const confidenceInfo = [];
  claims.forEach((c, i) => {
    const conf = (c && c.confidence) || "authoritative";
    if (conf !== "authoritative") {
      confidenceInfo.push({ index: i, claim_id: (c && c.claim_id) || null, confidence: conf });
    }
  });

  const signatureReport = {
    document_level: doc.signature ? "present" : "absent",
    per_claim: claims.map((c, i) => ({
      index: i,
      claim_id: (c && c.claim_id) || null,
      type: (c && c.type) || null,
      signature: c && c.signature ? "present" : "absent",
    })),
  };

  return { minimal, standard, strict, warnings, confidenceInfo, signatureReport, tier, tierBadge };
}

async function finalizeStrictForUrlMode(evalResult, urlContext) {
  const jwksUrl = `https://${urlContext.primaryDomainHost}${JWKS_PATH}`;
  let x2, x2note, x3, x3note;
  try {
    const resp = await fetch(jwksUrl, { cache: "no-store" });
    if (resp.status === 404) {
      x2 = "FAIL";
      x2note = `No JWKS found at ${JWKS_PATH}. §5.3 requires strict-tier documents to make the JWKS retrievable at this path.`;
      x3 = "SKIP";
      x3note = "skipped because JWKS fetch failed";
    } else if (!resp.ok) {
      x2 = "FAIL";
      x2note = `JWKS fetch returned HTTP ${resp.status}.`;
      x3 = "SKIP";
      x3note = "skipped because JWKS fetch failed";
    } else {
      try {
        await resp.clone().json();
        x2 = "PASS";
        const cc = resp.headers.get("Cache-Control") || "";
        const m = /max-age\s*=\s*(\d+)/i.exec(cc);
        if (m) {
          const maxAge = parseInt(m[1], 10);
          if (maxAge <= 86400) {
            x3 = "PASS";
          } else {
            x3 = "FAIL";
            x3note = `Cache-Control max-age is ${maxAge}, exceeds 86400.`;
          }
        } else {
          x3 = "FAIL";
          x3note = "§5.3 requires the JWKS be served with Cache-Control: max-age <= 86400. The response did not include a max-age directive.";
        }
      } catch (_err) {
        x2 = "FAIL";
        x2note = `The response at ${JWKS_PATH} is not valid JSON.`;
        x3 = "SKIP";
        x3note = "skipped because JWKS body is not JSON";
      }
    }
  } catch (err) {
    x2 = "SKIP";
    x2note = `Could not fetch JWKS due to network or CORS restriction. This is not necessarily a spec violation; the JWKS may exist but not permit cross-origin requests from llmo.org. (${err && err.message ? err.message : err})`;
    x3 = "SKIP";
    x3note = "skipped because JWKS fetch did not resolve";
  }
  const strict = evalResult.strict.map((c) => {
    if (c.id === "X2") return check("X2", "§5.3", "JWKS retrievable at /.well-known/llmo-keys.json", x2, x2note);
    if (c.id === "X3") return check("X3", "§5.3", "JWKS Cache-Control max-age is <= 86400", x3, x3note);
    return c;
  });
  const x1 = strict.find((c) => c.id === "X1");
  const x4 = strict.find((c) => c.id === "X4");
  const docInternalOk = x1.status === "PASS" && x4.status === "PASS";
  let tier = evalResult.tier;
  let tierBadge = evalResult.tierBadge;
  if (docInternalOk) {
    if (x2 === "PASS" && x3 === "PASS") {
      tier = "strict";
      tierBadge = { label: "Strict", variant: "green" };
    } else if (x2 === "SKIP") {
      tier = "strict-partial-cors";
      tierBadge = { label: "Strict (partial, CORS)", variant: "amber" };
    } else {
      tier = "standard";
      tierBadge = { label: "Standard", variant: "green" };
    }
  }
  return { ...evalResult, strict, tier, tierBadge };
}

function buildPlainText(result) {
  const lines = [];
  lines.push("LLMO Conformance Report");
  lines.push(`Source: ${result.source}`);
  lines.push(`Tier achieved: ${result.tierBadge.label}`);
  lines.push("");
  if (!result.jsonParseOk) {
    lines.push("JSON parse: FAIL");
    lines.push(result.parseError || "(no detail)");
    return lines.join("\n");
  }
  const section = (name, rows) => {
    if (!rows || rows.length === 0) return;
    const overall = rows.every((c) => c.status === "PASS" || c.status === "SKIP") ? "PASS" : "FAIL";
    lines.push(`${name}: ${overall}`);
    for (const c of rows) {
      lines.push(`  [${c.status}] ${c.section} (${c.id}): ${c.desc}`);
      if (c.note) lines.push(`         note: ${c.note}`);
    }
    lines.push("");
  };
  section("Minimal tier", result.checks.minimal);
  section("Standard tier", result.checks.standard);
  section("Strict tier", result.checks.strict);
  if (result.schemaErrors && result.schemaErrors.length > 0) {
    lines.push("Schema violations:");
    for (const e of result.schemaErrors) {
      lines.push(`  ${e.path || "(root)"}: ${e.message} (${e.schemaPath})`);
    }
    lines.push("");
  }
  lines.push(`Warnings: ${result.warnings.length === 0 ? "none" : ""}`);
  for (const w of result.warnings) {
    lines.push(`  [WARN] ${w.section} (${w.id}): ${w.desc}`);
  }
  lines.push("");
  lines.push("Confidence annotations (informational, per §3.7):");
  if (result.confidenceInfo.length === 0) {
    lines.push("  All claims carry authoritative confidence (default).");
  } else {
    for (const c of result.confidenceInfo) {
      const label = c.claim_id ? `"${c.claim_id}" (index ${c.index})` : `index ${c.index}`;
      lines.push(`  - claim ${label}: ${c.confidence}`);
    }
    lines.push("  Per §3.7: provisional confidence should be used sparingly. No action required; this is informational.");
  }
  lines.push("");
  lines.push("Signature presence:");
  lines.push(`  Document-level: ${result.signatureReport.document_level}`);
  if (result.signatureReport.per_claim.length === 0) {
    lines.push("  Per-claim: no claims");
  } else {
    for (const pc of result.signatureReport.per_claim) {
      const label = pc.claim_id ? `"${pc.claim_id}"` : `index ${pc.index}`;
      lines.push(`  Per-claim ${label} (${pc.type}): ${pc.signature}`);
    }
  }
  return lines.join("\n");
}

function badgeStyle(variant) {
  const palette = {
    green: { bg: "#d1fae5", fg: "#065f46", border: "#10b981" },
    amber: { bg: "#fef3c7", fg: "#78350f", border: "#d97706" },
    red: { bg: "#fee2e2", fg: "#991b1b", border: "#ef4444" },
    gray: { bg: "#e5e7eb", fg: "#374151", border: "#9ca3af" },
  }[variant || "gray"];
  return {
    display: "inline-block",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    fontWeight: 600,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    background: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.border}`,
  };
}

function statusColor(status) {
  if (status === "PASS") return "#065f46";
  if (status === "FAIL") return "#991b1b";
  if (status === "SKIP") return "#6b7280";
  if (status === "DEFERRED") return "#6b7280";
  return "#374151";
}

const ChecksList = ({ checks }) => {
  if (!checks || checks.length === 0) {
    return <p style={{ color: "#6b7280", fontStyle: "italic" }}>Not evaluated (prior tier did not pass).</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
      {checks.map((c) => (
        <li key={c.id} style={{ padding: "0.25rem 0", borderBottom: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
          <span style={{ color: statusColor(c.status), fontWeight: 600 }}>[{c.status}]</span>{" "}
          <span style={{ color: "#6b7280" }}>{c.section} ({c.id}):</span>{" "}
          <span>{c.desc}</span>
          {c.note ? <div style={{ color: "#6b7280", fontSize: "0.8125rem", marginTop: "0.125rem", marginLeft: "1.5rem" }}>note: {c.note}</div> : null}
        </li>
      ))}
    </ul>
  );
};

export const Validator = () => {
  const [initState, setInitState] = useState({ status: "loading", error: null });
  const [ajv, setAjv] = useState(null);
  const [validateFn, setValidateFn] = useState(null);
  const [testVectorText, setTestVectorText] = useState("");
  const [mode, setMode] = useState("paste");
  const [pasteInput, setPasteInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlConfirm, setUrlConfirm] = useState(null);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ajvInstance = await initAjv();
        const schemaResp = await fetch(SCHEMA_URL, { cache: "no-store" });
        if (!schemaResp.ok) throw new Error(`schema fetch returned HTTP ${schemaResp.status}`);
        const schema = await schemaResp.json();
        const validate = ajvInstance.compile(schema);
        const tvResp = await fetch(SELF_TEST_URL, { cache: "no-store" });
        const tv = tvResp.ok ? await tvResp.text() : "";
        if (cancelled) return;
        setAjv(ajvInstance);
        setValidateFn(() => validate);
        setTestVectorText(tv);
        setInitState({ status: "ready", error: null });
      } catch (err) {
        console.error("[validator] init failed", err);
        if (!cancelled) setInitState({ status: "failed", error: err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runPasteValidation = (text) => {
    setRunning(true);
    setResult(null);
    setCopyState("idle");
    const base = {
      source: "pasted input",
      mode: "paste",
      jsonParseOk: false,
      parseError: null,
      schemaErrors: [],
      checks: { minimal: [], standard: [], strict: [] },
      warnings: [],
      confidenceInfo: [],
      signatureReport: { document_level: "absent", per_claim: [] },
      tier: "none",
      tierBadge: { label: "None", variant: "red" },
    };
    let doc;
    try {
      doc = JSON.parse(text);
      base.jsonParseOk = true;
    } catch (err) {
      base.parseError = describeJsonParseError(text, err);
      base.tierBadge = { label: "None (parse error)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    const ok = validateFn(doc);
    const schemaErrors = ok
      ? []
      : (validateFn.errors || []).map((e) => ({
          path: e.instancePath || "(root)",
          message: e.message || "(no message)",
          schemaPath: e.schemaPath,
          params: e.params,
        }));
    const ev = evaluate(doc, ok, schemaErrors, null);
    const final = {
      ...base,
      schemaErrors,
      checks: { minimal: ev.minimal, standard: ev.standard, strict: ev.strict },
      warnings: ev.warnings,
      confidenceInfo: ev.confidenceInfo,
      signatureReport: ev.signatureReport,
      tier: ev.tier,
      tierBadge: ev.tierBadge,
    };
    setResult(final);
    setRunning(false);
  };

  const runUrlValidation = async (rawUrl) => {
    setRunning(true);
    setResult(null);
    setCopyState("idle");
    const scheme = /^https?:\/\//i.exec(rawUrl);
    if (!scheme) {
      const prepended = `https://${rawUrl}`;
      setUrlConfirm({ original: rawUrl, prepended });
      setRunning(false);
      return;
    }
    if (scheme[0].toLowerCase() === "http://") {
      const base = baseResultShell(`${rawUrl}`, "url");
      base.parseError = `The URL starts with http:// but §2.3 of the spec requires HTTPS. Retry with https://.`;
      base.tierBadge = { label: "None (HTTPS required)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    let host;
    try {
      host = new URL(rawUrl).hostname;
    } catch (_err) {
      const base = baseResultShell(rawUrl, "url");
      base.parseError = `The input "${rawUrl}" is not a valid URL. Enter a domain such as example.com.`;
      base.tierBadge = { label: "None (invalid URL)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    await fetchAndValidate(host);
  };

  const fetchAndValidate = async (host) => {
    const fetchedUrl = `https://${host}${WELL_KNOWN_PATH}`;
    const base = baseResultShell(fetchedUrl, "url");
    let resp;
    try {
      resp = await fetch(fetchedUrl, { cache: "no-store", redirect: "follow" });
    } catch (err) {
      base.parseError =
        `The request to ${fetchedUrl} failed before a response was received. ` +
        `This could indicate a DNS failure, a network connectivity issue, a TLS handshake failure, ` +
        `that the domain does not exist, or that the browser blocked the request for CORS reasons. ` +
        `If you have the document locally, download it and paste its contents into the textarea above. ` +
        `Underlying error: ${err && err.message ? err.message : err}`;
      base.tierBadge = { label: "None (network or CORS)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    if (resp.status === 404) {
      base.parseError =
        `No document found at ${fetchedUrl}. The server returned HTTP 404. ` +
        `Verify the document exists at exactly that path; §2.1 of the spec requires the canonical discovery path /.well-known/llmo.json.`;
      base.tierBadge = { label: "None (404)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    if (!resp.ok) {
      base.parseError = `The request to ${fetchedUrl} returned HTTP ${resp.status}. Verify the document exists at that path and is served over HTTPS with a 2xx response.`;
      base.tierBadge = { label: `None (HTTP ${resp.status})`, variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    const ct = (resp.headers.get("Content-Type") || "").toLowerCase();
    const text = await resp.text();
    if (ct.includes("text/html")) {
      base.parseError =
        `The response from ${fetchedUrl} has Content-Type ${ct}, not application/json. ` +
        `This usually means the server is serving its website homepage at that path instead of a JSON document, which indicates the llmo.json has not been deployed. ` +
        `Verify the file exists and is served with Content-Type application/llmo+json or application/json per §2.2.`;
      base.tierBadge = { label: "None (HTML response)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    let doc;
    try {
      doc = JSON.parse(text);
      base.jsonParseOk = true;
    } catch (err) {
      base.parseError = describeJsonParseError(text, err);
      base.tierBadge = { label: "None (parse error)", variant: "red" };
      setResult(base);
      setRunning(false);
      return;
    }
    const ok = validateFn(doc);
    const schemaErrors = ok
      ? []
      : (validateFn.errors || []).map((e) => ({
          path: e.instancePath || "(root)",
          message: e.message || "(no message)",
          schemaPath: e.schemaPath,
          params: e.params,
        }));
    const urlContext = { fetchedUrl, primaryDomainHost: host };
    let ev = evaluate(doc, ok, schemaErrors, urlContext);
    if (ev.tier === "strict-pending-jwks") {
      ev = await finalizeStrictForUrlMode(ev, urlContext);
    }
    const final = {
      ...base,
      schemaErrors,
      checks: { minimal: ev.minimal, standard: ev.standard, strict: ev.strict },
      warnings: ev.warnings,
      confidenceInfo: ev.confidenceInfo,
      signatureReport: ev.signatureReport,
      tier: ev.tier,
      tierBadge: ev.tierBadge,
    };
    setResult(final);
    setRunning(false);
  };

  const copyPlainText = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildPlainText(result));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (_err) {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 3000);
    }
  };

  const plainText = useMemo(() => (result ? buildPlainText(result) : ""), [result]);

  if (initState.status === "loading") {
    return (
      <div style={panelStyle}>
        <p style={{ margin: 0 }}>Loading validator...</p>
      </div>
    );
  }
  if (initState.status === "failed") {
    return (
      <div style={{ ...panelStyle, borderColor: "#ef4444", background: "#fef2f2" }}>
        <p style={{ fontWeight: 600, color: "#991b1b", margin: "0 0 0.5rem" }}>Validator initialization failed.</p>
        <p style={{ margin: "0 0 0.5rem" }}>This is a bug; please file an issue. No validation will be performed.</p>
        <p style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>
          {initState.error && initState.error.message ? initState.error.message : String(initState.error)}
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setMode("paste")}
          style={tabButtonStyle(mode === "paste")}
          type="button"
        >
          Paste
        </button>
        <button
          onClick={() => setMode("url")}
          style={tabButtonStyle(mode === "url")}
          type="button"
        >
          URL
        </button>
      </div>

      {mode === "paste" ? (
        <div>
          <label htmlFor="llmo-paste" style={labelStyle}>
            Paste the contents of your llmo.json
          </label>
          <textarea
            id="llmo-paste"
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            rows={14}
            placeholder='{"llmo_version": "0.1", "entity": {...}, ...}'
            style={textareaStyle}
          />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => runPasteValidation(pasteInput)}
              disabled={!pasteInput.trim() || running}
              style={primaryButtonStyle(!pasteInput.trim() || running)}
              type="button"
            >
              {running ? "Validating..." : "Validate"}
            </button>
            <button
              onClick={() => {
                setPasteInput(testVectorText);
                setResult(null);
              }}
              disabled={!testVectorText}
              style={secondaryButtonStyle(!testVectorText)}
              type="button"
            >
              Load strict test vector
            </button>
          </div>
          {!testVectorText ? (
            <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.5rem" }}>
              Self-test vector did not load. The rest of the validator still works on pasted input.
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <label htmlFor="llmo-url" style={labelStyle}>
            Domain or URL (the validator will fetch <code>/.well-known/llmo.json</code> under this domain)
          </label>
          <input
            id="llmo-url"
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              setUrlConfirm(null);
            }}
            placeholder="example.com or https://example.com"
            style={inputStyle}
          />
          {urlConfirm ? (
            <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", padding: "0.75rem", borderRadius: "0.375rem", margin: "0.5rem 0" }}>
              <p style={{ margin: "0 0 0.5rem", color: "#78350f" }}>
                The input <code>{urlConfirm.original}</code> has no scheme. Did you mean <code>{urlConfirm.prepended}</code>?
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={async () => {
                    setUrlConfirm(null);
                    setRunning(true);
                    try {
                      const host = new URL(urlConfirm.prepended).hostname;
                      await fetchAndValidate(host);
                    } finally {
                      setRunning(false);
                    }
                  }}
                  style={primaryButtonStyle(false)}
                  type="button"
                >
                  Yes, use {urlConfirm.prepended}
                </button>
                <button
                  onClick={() => setUrlConfirm(null)}
                  style={secondaryButtonStyle(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => runUrlValidation(urlInput.trim())}
              disabled={!urlInput.trim() || running}
              style={primaryButtonStyle(!urlInput.trim() || running)}
              type="button"
            >
              {running ? "Fetching..." : "Fetch and validate"}
            </button>
          </div>
        </div>
      )}

      {result ? (
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <span style={badgeStyle(result.tierBadge.variant)}>{result.tierBadge.label}</span>
            {result.tier && result.tier.startsWith("strict-partial") ? (
              <p style={{ marginTop: "0.5rem", color: "#78350f", fontSize: "0.875rem" }}>
                The document passes every Strict-tier check that does not require a live server fetch.
                Checks X2 and X3 (JWKS retrievability and Cache-Control) could not be evaluated in this mode.
              </p>
            ) : null}
            {result.source ? (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                Source: <code>{result.source}</code>
              </p>
            ) : null}
          </div>

          {result.parseError ? (
            <div style={{ background: "#fef2f2", border: "1px solid #ef4444", padding: "0.75rem", borderRadius: "0.375rem", whiteSpace: "pre-wrap", color: "#7f1d1d", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
              {result.parseError}
            </div>
          ) : (
            <>
              <h3 style={sectionHeadingStyle}>Minimal tier (§5.1)</h3>
              <ChecksList checks={result.checks.minimal} />
              <h3 style={sectionHeadingStyle}>Standard tier (§5.2)</h3>
              <ChecksList checks={result.checks.standard} />
              <h3 style={sectionHeadingStyle}>Strict tier (§5.3)</h3>
              <ChecksList checks={result.checks.strict} />

              {result.schemaErrors && result.schemaErrors.length > 0 ? (
                <>
                  <h3 style={sectionHeadingStyle}>Schema violations</h3>
                  <ul style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
                    {result.schemaErrors.map((e, i) => (
                      <li key={i}>
                        <code>{e.path || "(root)"}</code>: {e.message}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <h3 style={sectionHeadingStyle}>Warnings (§5.4)</h3>
              {result.warnings.length === 0 ? (
                <p style={{ color: "#6b7280" }}>None.</p>
              ) : (
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
                      <span style={{ color: "#b45309", fontWeight: 600 }}>[WARN]</span>{" "}
                      <span style={{ color: "#6b7280" }}>{w.section} ({w.id}):</span> {w.desc}
                    </li>
                  ))}
                </ul>
              )}

              <h3 style={sectionHeadingStyle}>Confidence annotations (informational, per §3.7)</h3>
              {result.confidenceInfo.length === 0 ? (
                <p style={{ color: "#6b7280" }}>All claims carry authoritative confidence (default).</p>
              ) : (
                <>
                  <ul style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
                    {result.confidenceInfo.map((c, i) => (
                      <li key={i}>
                        claim {c.claim_id ? `"${c.claim_id}" (index ${c.index})` : `index ${c.index}`}: {c.confidence}
                      </li>
                    ))}
                  </ul>
                  <p style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                    Per §3.7: provisional confidence should be used sparingly. No action required; this is informational.
                  </p>
                </>
              )}

              <h3 style={sectionHeadingStyle}>Signature presence</h3>
              <p style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
                Document-level: <strong>{result.signatureReport.document_level}</strong>
              </p>
              {result.signatureReport.per_claim.length > 0 ? (
                <ul style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem" }}>
                  {result.signatureReport.per_claim.map((pc, i) => (
                    <li key={i}>
                      claim {pc.claim_id ? `"${pc.claim_id}"` : `index ${pc.index}`} ({pc.type}): {pc.signature}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#6b7280" }}>No claims.</p>
              )}
            </>
          )}

          <h3 style={sectionHeadingStyle}>Plain-text report</h3>
          <pre style={preStyle}>{plainText}</pre>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={copyPlainText} style={secondaryButtonStyle(false)} type="button">
              Copy plain-text report
            </button>
            {copyState === "copied" ? (
              <span style={{ color: "#065f46", fontSize: "0.875rem" }}>Copied.</span>
            ) : copyState === "failed" ? (
              <span style={{ color: "#991b1b", fontSize: "0.875rem" }}>Copy failed. Select the text manually.</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

function baseResultShell(source, mode) {
  return {
    source,
    mode,
    jsonParseOk: false,
    parseError: null,
    schemaErrors: [],
    checks: { minimal: [], standard: [], strict: [] },
    warnings: [],
    confidenceInfo: [],
    signatureReport: { document_level: "absent", per_claim: [] },
    tier: "none",
    tierBadge: { label: "None", variant: "red" },
  };
}

const panelStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  padding: "1rem",
  background: "#fafafa",
  margin: "1rem 0",
};

const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: "0.25rem",
  fontSize: "0.875rem",
};

const textareaStyle = {
  width: "100%",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.8125rem",
  padding: "0.5rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.25rem",
  marginBottom: "0.5rem",
  resize: "vertical",
  boxSizing: "border-box",
};

const inputStyle = {
  width: "100%",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.875rem",
  padding: "0.5rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.25rem",
  marginBottom: "0.5rem",
  boxSizing: "border-box",
};

function primaryButtonStyle(disabled) {
  return {
    padding: "0.5rem 1rem",
    background: disabled ? "#9ca3af" : "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: "0.25rem",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  };
}

function secondaryButtonStyle(disabled) {
  return {
    padding: "0.5rem 1rem",
    background: "#ffffff",
    color: disabled ? "#9ca3af" : "#111827",
    border: `1px solid ${disabled ? "#d1d5db" : "#111827"}`,
    borderRadius: "0.25rem",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  };
}

function tabButtonStyle(active) {
  return {
    padding: "0.375rem 0.75rem",
    background: active ? "#111827" : "#ffffff",
    color: active ? "#ffffff" : "#111827",
    border: "1px solid #111827",
    borderRadius: "0.25rem",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  };
}

const sectionHeadingStyle = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "1rem 0 0.25rem",
};

const preStyle = {
  background: "#111827",
  color: "#f9fafb",
  padding: "0.75rem",
  borderRadius: "0.375rem",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.8125rem",
  overflowX: "auto",
  whiteSpace: "pre",
};
