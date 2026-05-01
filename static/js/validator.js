(function () {
  "use strict";

  // Build-time constants. Injected by layouts/validator/list.html via Hugo template.
  const _BUILD = (typeof window !== 'undefined' && window.LLMO_VALIDATOR_BUILD) || { version: 'DEV', date: '', sha: 'DEV' };
  const VERSION = _BUILD.version;
  const BUILD_DATE = _BUILD.date;
  const COMMIT_SHA = _BUILD.sha;

  var B64URL = /^[A-Za-z0-9_-]+$/;
  var ALLOWED_ALGS = ["ES256", "ES384", "EdDSA"];
  var WELL_KNOWN = "/.well-known/llmo.json";

  var schema = null;
  var strictVectorText = null;
  var ajvValidate = null;
  var canonicalizeFn = null;

  var jwksCache = {};

  function resetJwksCache() {
    jwksCache = {};
  }

  async function fetchJwksOnce(urlContext) {
    var hostname = urlContext && urlContext.hostname;
    if (!hostname) {
      return { error: "no_hostname" };
    }
    if (jwksCache[hostname]) {
      return jwksCache[hostname];
    }
    var promise = (async function () {
      try {
        var proxyUrl = "/api/fetch-jwks?domain=" + encodeURIComponent(hostname);
        var resp = await fetch(proxyUrl);
        if (!resp.ok) {
          var errBody = await resp.json().catch(function () { return {}; });
          return { error: "jwks_unreachable", detail: errBody.error || ("proxy_status_" + resp.status) };
        }
        var jwks = await resp.json();
        if (!jwks.keys || !Array.isArray(jwks.keys)) {
          return { error: "jwks_malformed" };
        }
        return { jwks: jwks };
      } catch (err) {
        return { error: "jwks_fetch_failed" };
      }
    })();
    jwksCache[hostname] = promise;
    return promise;
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillFooter();
    readEmbeds();
    wireTabs();
    wireButtons();
    initAjv().then(function () {
      setReady();
    }).catch(function (err) {
      setInitError(err);
    });
  });

  function fillFooter() {
    document.getElementById("footer-v").textContent = VERSION;
    document.getElementById("footer-sha").textContent = COMMIT_SHA;
    document.getElementById("footer-build").textContent = BUILD_DATE;
  }

  function readEmbeds() {
    try {
      schema = JSON.parse(document.getElementById("llmo-schema").textContent);
    } catch (e) {
      throw new Error("embedded schema failed to parse: " + e.message);
    }
    strictVectorText = document.getElementById("llmo-strict-vector").textContent.trim();
    try {
      JSON.parse(strictVectorText);
    } catch (e) {
      throw new Error("embedded strict test vector failed to parse: " + e.message);
    }
  }

  function wireTabs() {
    var tabPaste = document.getElementById("tab-paste");
    var tabUrl = document.getElementById("tab-url");
    var panelPaste = document.getElementById("panel-paste");
    var panelUrl = document.getElementById("panel-url");
    function show(mode) {
      var paste = mode === "paste";
      tabPaste.setAttribute("aria-selected", paste ? "true" : "false");
      tabUrl.setAttribute("aria-selected", paste ? "false" : "true");
      panelPaste.classList.toggle("hidden", !paste);
      panelUrl.classList.toggle("hidden", paste);
      panelPaste.hidden = !paste;
      panelUrl.hidden = paste;
    }
    tabPaste.addEventListener("click", function () { show("paste"); });
    tabUrl.addEventListener("click", function () { show("url"); });
  }

  function wireButtons() {
    document.getElementById("btn-load-self-test").addEventListener("click", function () {
      var ta = document.getElementById("paste-input");
      try {
        var parsed = JSON.parse(strictVectorText);
        ta.value = JSON.stringify(parsed, null, 2);
      } catch (_e) {
        ta.value = strictVectorText;
      }
    });
    document.getElementById("btn-validate-paste").addEventListener("click", function () {
      runPasteValidation(document.getElementById("paste-input").value);
    });
    document.getElementById("btn-validate-url").addEventListener("click", function () {
      runUrlValidation(document.getElementById("url-input").value.trim());
    });
    document.getElementById("btn-url-confirm-no").addEventListener("click", function () {
      hideUrlConfirm();
    });
  }

  function setReady() {
    document.getElementById("btn-validate-paste").disabled = false;
    document.getElementById("btn-validate-paste").textContent = "Validate";
    document.getElementById("btn-validate-url").disabled = false;
    document.getElementById("btn-validate-url").textContent = "Fetch and validate";
    var tip = document.getElementById("init-status");
    if (tip) tip.textContent = "";
  }

  function setInitError(err) {
    var section = document.getElementById("results-section");
    section.classList.remove("hidden"); section.hidden = false;
    var body = document.getElementById("results-body");
    body.innerHTML = "";
    var div = document.createElement("div");
    div.className = "errbox";
    var msg = (err && err.message) ? err.message : String(err);
    div.textContent =
      "Validator initialization failed. This is a bug; please file an issue at " +
      "https://github.com/openllmo/llmo-validator/issues. No validation will be performed.\n\n" +
      "Detail: " + msg;
    body.appendChild(div);
    document.getElementById("btn-validate-paste").disabled = true;
    document.getElementById("btn-validate-paste").textContent = "Unavailable";
    document.getElementById("btn-validate-url").disabled = true;
    document.getElementById("btn-validate-url").textContent = "Unavailable";
    var tip = document.getElementById("init-status");
    if (tip) tip.textContent = "Initialization failed.";
  }

  function loadAjvDynamic() {
    return Promise.all([
      import("https://esm.sh/ajv@8/dist/2020.js"),
      import("https://esm.sh/ajv-formats@3"),
      import("https://esm.sh/canonicalize@2.0.0")
    ]).then(function (mods) { return { ajvMod: mods[0], formatsMod: mods[1], canonMod: mods[2] }; });
  }

  function loadAjvViaScriptTag() {
    return new Promise(function (resolve, reject) {
      if (typeof document === "undefined") { reject(new Error("document is not available")); return; }
      if (window.__llmo_validator_ajv) { resolve(window.__llmo_validator_ajv); return; }
      var s = document.createElement("script");
      s.type = "module";
      s.textContent =
        "(async () => {\n" +
        "  try {\n" +
        "    const [ajvMod, formatsMod, canonMod] = await Promise.all([\n" +
        "      import('https://esm.sh/ajv@8/dist/2020.js'),\n" +
        "      import('https://esm.sh/ajv-formats@3'),\n" +
        "      import('https://esm.sh/canonicalize@2.0.0')\n" +
        "    ]);\n" +
        "    window.__llmo_validator_ajv = { ajvMod, formatsMod, canonMod };\n" +
        "    window.dispatchEvent(new CustomEvent('__llmo_validator_ajv_ready'));\n" +
        "  } catch (err) {\n" +
        "    window.__llmo_validator_ajv_err = err;\n" +
        "    window.dispatchEvent(new CustomEvent('__llmo_validator_ajv_failed', { detail: err }));\n" +
        "  }\n" +
        "})();";
      var settled = false;
      function done(fn, arg) {
        if (settled) return; settled = true;
        window.removeEventListener("__llmo_validator_ajv_ready", onReady);
        window.removeEventListener("__llmo_validator_ajv_failed", onFailed);
        fn(arg);
      }
      function onReady() { done(resolve, window.__llmo_validator_ajv); }
      function onFailed(e) { done(reject, (e && e.detail) || new Error("script tag injection failed")); }
      window.addEventListener("__llmo_validator_ajv_ready", onReady, { once: true });
      window.addEventListener("__llmo_validator_ajv_failed", onFailed, { once: true });
      document.head.appendChild(s);
      setTimeout(function () { done(reject, new Error("script tag injection timed out after 15s")); }, 15000);
    });
  }

  function pickCallable(mod, pref) {
    if (!mod) return null;
    if (pref && typeof mod[pref] === "function") return mod[pref];
    if (typeof mod.default === "function") return mod.default;
    if (typeof mod === "function") return mod;
    if (mod.default && mod.default.default && typeof mod.default.default === "function") return mod.default.default;
    return null;
  }

  function initAjv() {
    return loadAjvDynamic().catch(function (e1) {
      console.warn("[validator] dynamic import failed, trying script tag", e1);
      return loadAjvViaScriptTag().catch(function (e2) {
        console.error("[validator] both AJV load paths failed", e1, e2);
        throw new Error(
          "AJV failed to load. dynamic import: " + (e1 && e1.message ? e1.message : e1) +
          "; script tag: " + (e2 && e2.message ? e2.message : e2)
        );
      });
    }).then(function (mods) {
      var Ajv = pickCallable(mods.ajvMod, "default") || pickCallable(mods.ajvMod, "Ajv2020");
      var addFormats = pickCallable(mods.formatsMod, "default");
      var canon = pickCallable(mods.canonMod, "default");
      if (!Ajv) throw new Error("AJV module did not expose a callable default export");
      if (!addFormats) throw new Error("ajv-formats module did not expose a callable default export");
      if (!canon) throw new Error("canonicalize module did not expose a callable default export");
      var ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);
      ajvValidate = ajv.compile(schema);
      canonicalizeFn = canon;
    });
  }

  // ---- evaluation helpers ------------------------------------------------

  function isUriLike(s) {
    if (typeof s !== "string") return false;
    try { var u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; }
    catch (_e) { return false; }
  }
  function subdomainOrEqual(host, owned) { return host === owned || host.endsWith("." + owned); }
  function daysBetween(a, b) {
    var aa = Date.parse(a), bb = Date.parse(b);
    if (isNaN(aa) || isNaN(bb)) return null;
    return Math.round((bb - aa) / 86400000);
  }
  function b64urlDecode(s) {
    var std = s.replace(/-/g, "+").replace(/_/g, "/");
    var pad = std.length % 4;
    return atob(pad ? std + "=".repeat(4 - pad) : std);
  }
  function base64UrlDecodeToString(s) { return b64urlDecode(s); }
  function base64UrlDecodeToBytes(s) {
    var raw = b64urlDecode(s);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
  function base64UrlEncode(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function check(id, cite, desc, status, note) {
    return { id: id, cite: cite, desc: desc, status: status, note: note || null };
  }

  function canonicalizeWithoutSignature(obj) {
    if (!canonicalizeFn) {
      throw new Error("canonicalize module not loaded");
    }
    var copy = JSON.parse(JSON.stringify(obj));
    delete copy.signature;
    return canonicalizeFn(copy);
  }

  function collectClaimUrls(claim) {
    var urls = [];
    var t = claim.type;
    var s = claim.statement;
    if (!s || typeof s !== "object") return urls;
    function push(u, tpa) { if (isUriLike(u)) urls.push({ url: u, thirdPartyAllowed: tpa }); }
    if (t === "canonical_urls") {
      Object.keys(s).forEach(function (k) { push(s[k], false); });
    } else if (t === "official_channels") {
      if (s.community && typeof s.community === "object")
        Object.keys(s.community).forEach(function (k) { push(s.community[k], true); });
    } else if (t === "product_facts") {
      if (Array.isArray(s.products)) s.products.forEach(function (p) { if (p && p.url) push(p.url, false); });
    } else if (t === "personnel") {
      if (Array.isArray(s.spokespeople)) s.spokespeople.forEach(function (sp) { if (sp && sp.verification) push(sp.verification, true); });
    } else if (t === "disavowal") {
      if (Array.isArray(s.disavowed)) s.disavowed.forEach(function (d) { if (d && d.url) push(d.url, true); });
    } else if (t === "supersedes") {
      if (Array.isArray(s.superseded)) s.superseded.forEach(function (x) { if (x && x.url) push(x.url, false); });
    } else if (t === "pointer") {
      if (s.url) push(s.url, true);
    }
    return urls;
  }

  function evaluate(doc, schemaOk, schemaErrors, urlContext) {
    resetJwksCache();
    var claims = Array.isArray(doc.claims) ? doc.claims : [];
    var entity = doc.entity && typeof doc.entity === "object" ? doc.entity : {};
    var owned = [entity.primary_domain].concat(Array.isArray(entity.aliases) ? entity.aliases : [])
      .filter(function (d) { return typeof d === "string"; })
      .map(function (d) { return d.toLowerCase(); });
    var days = daysBetween(doc.valid_from, doc.valid_until);

    var minimal = [];
    if (urlContext) {
      var expected = "https://" + urlContext.primaryDomainHost + WELL_KNOWN;
      var ok = urlContext.fetchedUrl === expected;
      minimal.push(check("M1", "§5.1", "served at /.well-known/llmo.json over HTTPS",
        ok ? "PASS" : "FAIL",
        ok ? null : "fetched URL was " + urlContext.fetchedUrl + ", expected " + expected));
    } else {
      minimal.push(check("M1", "§5.1", "served at /.well-known/llmo.json over HTTPS", "SKIP", "skipped in paste mode"));
    }
    minimal.push(check("M2", "§5.1", "document parses as valid JSON", "PASS"));
    minimal.push(check("M3", "§5.1, §3.1",
      "required top-level fields present and structurally valid against /spec/v0.1/schema.json",
      schemaOk ? "PASS" : "FAIL",
      schemaOk ? null : schemaErrors.length + " schema violation(s); see schema errors below"));
    var m4 = doc.llmo_version === "0.1";
    minimal.push(check("M4", "§5.1", 'llmo_version is "0.1"',
      m4 ? "PASS" : "FAIL", m4 ? null : "llmo_version was " + JSON.stringify(doc.llmo_version)));
    var m5ok = false, m5note = null;
    if (typeof doc.valid_from !== "string" || typeof doc.valid_until !== "string") {
      m5note = "valid_from or valid_until missing or not a string";
    } else if (days === null) {
      m5note = "valid_from or valid_until is not a parseable RFC 3339 timestamp";
    } else if (Date.parse(doc.valid_from) >= Date.parse(doc.valid_until)) {
      m5note = "valid_from does not precede valid_until";
    } else if (days > 365) {
      m5note = "validity window is " + days + " days, exceeds 365";
    } else {
      m5ok = true;
    }
    minimal.push(check("M5", "§5.1, §3.3",
      "validity window is <= 365 days and valid_from precedes valid_until",
      m5ok ? "PASS" : "FAIL", m5note));
    var m6ok = claims.length === 0 || claims.every(function (c) {
      return c && typeof c === "object" && typeof c.type === "string" && c.statement && typeof c.statement === "object";
    });
    minimal.push(check("M6", "§5.1", "all claims have type and statement",
      m6ok ? "PASS" : "FAIL", m6ok ? null : "one or more claims is missing type or statement"));

    var minimalOk = minimal.every(function (c) { return c.status === "PASS" || c.status === "SKIP"; });

    var standard = [];
    var standardOk = false;
    if (minimalOk) {
      var cuClaims = claims.filter(function (c) { return c.type === "canonical_urls"; });
      var ocClaims = claims.filter(function (c) { return c.type === "official_channels"; });
      standard.push(check("S1", "§5.2", "at least one canonical_urls claim",
        cuClaims.length >= 1 ? "PASS" : "FAIL",
        cuClaims.length === 0 ? "no canonical_urls claim found" : null));
      standard.push(check("S2", "§5.2", "at least one official_channels claim",
        ocClaims.length >= 1 ? "PASS" : "FAIL",
        ocClaims.length === 0 ? "no official_channels claim found" : null));
      if (urlContext) {
        var primary = typeof entity.primary_domain === "string" ? entity.primary_domain.toLowerCase() : "";
        var s3ok = primary === urlContext.primaryDomainHost.toLowerCase();
        standard.push(check("S3", "§5.2", "entity.primary_domain matches serving domain",
          s3ok ? "PASS" : "FAIL",
          s3ok ? null : 'entity.primary_domain is "' + primary + '" but document served from "' + urlContext.primaryDomainHost + '"'));
      } else {
        standard.push(check("S3", "§5.2", "entity.primary_domain matches serving domain", "SKIP",
          "skipped in paste mode (no serving domain to compare)"));
      }
      var issues = [];
      claims.forEach(function (c, i) {
        collectClaimUrls(c).forEach(function (u) {
          if (u.thirdPartyAllowed) return;
          try {
            var host = new URL(u.url).hostname.toLowerCase();
            var ok = owned.some(function (d) { return subdomainOrEqual(host, d); });
            if (!ok) issues.push("claim[" + i + "] (" + c.type + "): " + u.url + " resolves to " + host + ", not in owned set {" + (owned.join(", ") || "empty") + "}");
          } catch (_e) {
            issues.push("claim[" + i + "] (" + c.type + "): " + u.url + " is not a parseable URL");
          }
        });
      });
      standard.push(check("S4", "§5.2", "all claim URLs resolve to owned domain or are explicit third-party pointers",
        issues.length === 0 ? "PASS" : "FAIL", issues.length === 0 ? null : issues.join("; ")));
      if (days !== null && m5ok) {
        var s5ok = days <= 180;
        standard.push(check("S5", "§5.2", "validity window is <= 180 days",
          s5ok ? "PASS" : "FAIL", s5ok ? null : "validity window is " + days + " days, exceeds 180"));
      } else {
        standard.push(check("S5", "§5.2", "validity window is <= 180 days", "FAIL", "validity window unparseable"));
      }
      standardOk = standard.every(function (c) { return c.status === "PASS" || c.status === "SKIP"; });
    }

    var strict = [];
    var tier = "none";
    var tierBadge = { label: "None", variant: "fail" };

    if (schemaOk && minimalOk && !standardOk) {
      tier = "minimal"; tierBadge = { label: "Minimal", variant: "pass" };
    } else if (schemaOk && minimalOk && standardOk) {
      var x1ok = false, x1note = null;
      var sig = doc.signature;
      if (!sig || typeof sig !== "object") {
        x1note = "document-level signature field is absent";
      } else {
        var keys = Object.keys(sig).sort().join(",");
        if (keys !== "protected,signature") {
          x1note = "signature object has unexpected keys: " + keys;
        } else if (typeof sig.protected !== "string" || typeof sig.signature !== "string") {
          x1note = "signature.protected or signature.signature is not a string";
        } else if (!B64URL.test(sig.protected) || !B64URL.test(sig.signature)) {
          x1note = "signature.protected or signature.signature is not base64url";
        } else {
          try {
            var header = JSON.parse(b64urlDecode(sig.protected));
            if (ALLOWED_ALGS.indexOf(header.alg) < 0) {
              x1note = "JWS protected header alg is " + JSON.stringify(header.alg) + ", must be ES256, ES384, or EdDSA";
            } else if (!header.kid) {
              x1note = "JWS protected header is missing kid";
            } else {
              x1ok = true;
            }
          } catch (_e) {
            x1note = "JWS protected header does not decode to valid JSON";
          }
        }
      }
      strict.push(check("X1", "§5.3, §4.3",
        "document-level signature field is present and structurally valid (not cryptographically verified)",
        x1ok ? "PASS" : "FAIL", x1note));

      var x4ok = false;
      var cuList = claims.filter(function (c) { return c.type === "canonical_urls"; });
      for (var i = 0; i < cuList.length && !x4ok; i++) {
        var st = cuList[i].statement || {};
        var vals = Object.keys(st).map(function (k) { return st[k]; });
        for (var j = 0; j < vals.length; j++) {
          if (!isUriLike(vals[j])) continue;
          var h = new URL(vals[j]).hostname.toLowerCase();
          if (owned.some(function (d) { return subdomainOrEqual(h, d); })) { x4ok = true; break; }
        }
      }
      strict.push(check("X4", "§5.3",
        "at least one canonical_urls claim has a URL on the entity's owned domain",
        x4ok ? "PASS" : "FAIL", x4ok ? null : "no canonical_urls URL matches primary_domain or aliases"));

      // X2 / X3 / X5: deferred in URL mode (resolved by caller); SKIP in paste mode.
      var hasSig = doc.signature && typeof doc.signature === "object";
      if (urlContext) {
        strict.push({ id: "X2", cite: "§5.3", desc: "JWKS retrievable at /.well-known/llmo-keys.json", status: "DEFERRED", note: null });
        strict.push({ id: "X3", cite: "§5.3", desc: "JWKS Cache-Control max-age is <= 86400", status: "DEFERRED", note: null });
        if (hasSig) {
          strict.push({ id: "X5", cite: "§4.3, §5.3", desc: "document signature cryptographically verifies", status: "DEFERRED", note: null });
        } else {
          strict.push(check("X5", "§4.3, §5.3", "document signature cryptographically verifies", "SKIP", "no document-level signature present"));
        }
      } else {
        strict.push(check("X2", "§5.3", "JWKS retrievable at /.well-known/llmo-keys.json", "SKIP", "skipped in paste mode"));
        strict.push(check("X3", "§5.3", "JWKS Cache-Control max-age is <= 86400", "SKIP", "skipped in paste mode"));
        var x5PasteNote = hasSig
          ? "skipped in paste mode (origin needed for JWKS fetch)"
          : "no document-level signature present";
        strict.push(check("X5", "§4.3, §5.3", "document signature cryptographically verifies", "SKIP", x5PasteNote));
      }

      var hasAnyClaimSig = claims.some(function (c) {
        return c && c.signature && typeof c.signature === "object";
      });
      if (urlContext) {
        if (!hasAnyClaimSig) {
          strict.push(check("X6", "§5.3", "all present per-claim signatures cryptographically verify",
            "PASS", "no per-claim signatures present"));
        } else {
          strict.push({ id: "X6", cite: "§5.3", desc: "all present per-claim signatures cryptographically verify",
            status: "DEFERRED", note: null });
        }
      } else {
        strict.push(check("X6", "§5.3", "all present per-claim signatures cryptographically verify",
          "SKIP", "skipped in paste mode (origin needed for JWKS fetch)"));
      }

      var docInternalOk = x1ok && x4ok;
      if (docInternalOk) {
        if (urlContext) {
          tier = "strict-pending-jwks"; tierBadge = { label: "Strict (evaluating JWKS)", variant: "partial" };
        } else {
          tier = "strict-paste"; tierBadge = { label: "Strict (partial, paste mode)", variant: "partial" };
        }
      } else {
        tier = "standard"; tierBadge = { label: "Standard", variant: "pass" };
      }
    }

    if (!schemaOk) { tier = "none"; tierBadge = { label: "None", variant: "fail" }; }

    var warnings = [];
    if (schemaOk && m5ok && days !== null && days > 180 && days <= 365) {
      warnings.push({ id: "W1", cite: "§5.4",
        desc: "validity window is " + days + " days, exceeds the 180-day Standard-tier threshold (conformant but discouraged)" });
    }
    claims.forEach(function (c, i) {
      if (c.type !== "personnel") return;
      var sps = c.statement && Array.isArray(c.statement.spokespeople) ? c.statement.spokespeople : [];
      sps.forEach(function (sp) {
        if (!sp || !sp.verification) {
          warnings.push({ id: "W2", cite: "§5.4",
            desc: 'personnel spokesperson "' + (sp && sp.name ? sp.name : "(unnamed)") + '" in claim[' + i + "] has no verification URL" });
        }
      });
    });

    var confidenceInfo = [];
    claims.forEach(function (c, i) {
      var conf = (c && c.confidence) || "authoritative";
      if (conf !== "authoritative") {
        confidenceInfo.push({ index: i, claim_id: (c && c.claim_id) || null, confidence: conf });
      }
    });

    var signatureReport = {
      document_level: {
        presence: doc.signature ? "present" : "absent",
        verification: null
      },
      per_claim: claims.map(function (c, i) {
        return {
          index: i,
          claim_id: (c && c.claim_id) || null,
          type: (c && c.type) || null,
          presence: c && c.signature ? "present" : "absent",
          verification: null
        };
      })
    };

    return {
      minimal: minimal, standard: standard, strict: strict,
      warnings: warnings, confidenceInfo: confidenceInfo,
      signatureReport: signatureReport, tier: tier, tierBadge: tierBadge
    };
  }

  function finalizeStrictForUrlMode(ev, doc, urlContext) {
    var jwksUrl = "https://" + urlContext.primaryDomainHost + "/.well-known/llmo-keys.json";
    return fetch(jwksUrl, { cache: "no-store" }).then(function (resp) {
      var x2, x2n, x3, x3n;
      if (resp.status === 404) {
        x2 = "FAIL"; x2n = "No JWKS found at /.well-known/llmo-keys.json. §5.3 requires strict-tier documents to make the JWKS retrievable at this path.";
        x3 = "SKIP"; x3n = "skipped because JWKS fetch failed";
        return applyX23(ev, x2, x2n, x3, x3n);
      }
      if (!resp.ok) {
        x2 = "FAIL"; x2n = "JWKS fetch returned HTTP " + resp.status + ".";
        x3 = "SKIP"; x3n = "skipped because JWKS fetch failed";
        return applyX23(ev, x2, x2n, x3, x3n);
      }
      var cc = resp.headers.get("Cache-Control") || "";
      return resp.clone().json().then(function () {
        var x2 = "PASS", x2n = null, x3, x3n;
        var m = /max-age\s*=\s*(\d+)/i.exec(cc);
        if (m) {
          var age = parseInt(m[1], 10);
          if (age <= 86400) { x3 = "PASS"; x3n = null; }
          else { x3 = "FAIL"; x3n = "Cache-Control max-age is " + age + ", exceeds 86400."; }
        } else {
          x3 = "FAIL";
          x3n = "§5.3 requires the JWKS be served with Cache-Control: max-age <= 86400. The response did not include a max-age directive.";
        }
        return applyX23(ev, x2, x2n, x3, x3n);
      }).catch(function () {
        return applyX23(ev, "FAIL", "The response at /.well-known/llmo-keys.json is not valid JSON.", "SKIP", "skipped because JWKS body is not JSON");
      });
    }).catch(function (err) {
      return applyX23(ev, "SKIP",
        "Could not fetch JWKS due to network or CORS restriction. This is not necessarily a spec violation; the JWKS may exist but not permit cross-origin requests from llmo.org/validator/. (" + (err && err.message ? err.message : err) + ")",
        "SKIP", "skipped because JWKS fetch did not resolve");
    }).then(function (evAfterX23) {
      return verifyAndApplyX5X6(evAfterX23, doc, urlContext);
    });
  }

  function applyX23(ev, x2, x2n, x3, x3n) {
    ev.strict = ev.strict.map(function (c) {
      if (c.id === "X2") return check("X2", "§5.3", "JWKS retrievable at /.well-known/llmo-keys.json", x2, x2n);
      if (c.id === "X3") return check("X3", "§5.3", "JWKS Cache-Control max-age is <= 86400", x3, x3n);
      return c;
    });
    var x1 = ev.strict.find(function (c) { return c.id === "X1"; });
    var x4 = ev.strict.find(function (c) { return c.id === "X4"; });
    var docOk = x1.status === "PASS" && x4.status === "PASS";
    if (docOk) {
      if (x2 === "PASS" && x3 === "PASS") { ev.tier = "strict"; ev.tierBadge = { label: "Strict", variant: "pass" }; }
      else if (x2 === "SKIP") { ev.tier = "strict-partial-cors"; ev.tierBadge = { label: "Strict (partial, CORS)", variant: "partial" }; }
      else { ev.tier = "standard"; ev.tierBadge = { label: "Standard", variant: "pass" }; }
    }
    return ev;
  }

  // ---- X5: cryptographic signature verification ------------------------

  async function verifyDocumentSignature(doc, urlContext) {
    if (!doc || !doc.signature || !doc.signature.protected || !doc.signature.signature) {
      return { applicable: false, reason: "no_signature" };
    }
    if (!urlContext || !urlContext.hostname) {
      return { applicable: false, reason: "paste_mode_no_origin" };
    }

    var header;
    try {
      var protectedJson = base64UrlDecodeToString(doc.signature.protected);
      header = JSON.parse(protectedJson);
    } catch (err) {
      return { applicable: true, verified: false, error: "protected_header_decode_failed" };
    }

    if (!header.alg || !header.kid) {
      return { applicable: true, verified: false, error: "protected_header_missing_alg_or_kid" };
    }
    if (header.alg !== "ES256") {
      return { applicable: true, verified: false, error: "unsupported_alg", alg: header.alg };
    }

    var jwksResult = await fetchJwksOnce(urlContext);
    if (jwksResult.error) {
      return { applicable: true, verified: false, error: jwksResult.error, detail: jwksResult.detail };
    }
    var jwks = jwksResult.jwks;

    var key = jwks.keys.find(function (k) { return k.kid === header.kid; });
    if (!key) {
      return { applicable: true, verified: false, error: "kid_not_in_jwks", kid: header.kid };
    }
    if (key.kty !== "EC" || key.crv !== "P-256") {
      return { applicable: true, verified: false, error: "key_type_mismatch_for_es256" };
    }

    var publicKey;
    try {
      publicKey = await crypto.subtle.importKey(
        "jwk",
        { kty: "EC", crv: "P-256", x: key.x, y: key.y, ext: true },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      );
    } catch (err) {
      return { applicable: true, verified: false, error: "key_import_failed" };
    }

    var payloadCanonical;
    try {
      var canonicalString = canonicalizeWithoutSignature(doc);
      payloadCanonical = new TextEncoder().encode(canonicalString);
    } catch (err) {
      return { applicable: true, verified: false, error: "canonicalization_failed" };
    }

    var protectedB64 = doc.signature.protected;
    var payloadB64 = base64UrlEncode(payloadCanonical);
    var signingInput = new TextEncoder().encode(protectedB64 + "." + payloadB64);

    var signatureBytes;
    try {
      signatureBytes = base64UrlDecodeToBytes(doc.signature.signature);
    } catch (err) {
      return { applicable: true, verified: false, error: "signature_decode_failed" };
    }
    if (signatureBytes.length !== 64) {
      return { applicable: true, verified: false, error: "signature_wrong_length", length: signatureBytes.length };
    }

    var verified;
    try {
      verified = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        signatureBytes,
        signingInput
      );
    } catch (err) {
      return { applicable: true, verified: false, error: "verify_threw" };
    }

    return { applicable: true, verified: verified, kid: header.kid, alg: header.alg };
  }

  async function verifyClaimSignature(claim, urlContext) {
    if (!claim || !claim.signature || !claim.signature.protected || !claim.signature.signature) {
      return { applicable: false, reason: "no_signature" };
    }
    if (!urlContext || !urlContext.hostname) {
      return { applicable: false, reason: "paste_mode_no_origin" };
    }

    var header;
    try {
      var protectedJson = base64UrlDecodeToString(claim.signature.protected);
      header = JSON.parse(protectedJson);
    } catch (err) {
      return { applicable: true, verified: false, error: "protected_header_decode_failed" };
    }

    if (!header.alg || !header.kid) {
      return { applicable: true, verified: false, error: "protected_header_missing_alg_or_kid" };
    }
    if (header.alg !== "ES256") {
      return { applicable: true, verified: false, error: "unsupported_alg", alg: header.alg };
    }

    var jwksResult = await fetchJwksOnce(urlContext);
    if (jwksResult.error) {
      return { applicable: true, verified: false, error: jwksResult.error, detail: jwksResult.detail };
    }
    var jwks = jwksResult.jwks;

    var key = jwks.keys.find(function (k) { return k.kid === header.kid; });
    if (!key) {
      return { applicable: true, verified: false, error: "kid_not_in_jwks", kid: header.kid };
    }
    if (key.kty !== "EC" || key.crv !== "P-256") {
      return { applicable: true, verified: false, error: "key_type_mismatch_for_es256" };
    }

    var publicKey;
    try {
      publicKey = await crypto.subtle.importKey(
        "jwk",
        { kty: "EC", crv: "P-256", x: key.x, y: key.y, ext: true },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      );
    } catch (err) {
      return { applicable: true, verified: false, error: "key_import_failed" };
    }

    var payloadCanonical;
    try {
      var canonicalString = canonicalizeWithoutSignature(claim);
      payloadCanonical = new TextEncoder().encode(canonicalString);
    } catch (err) {
      return { applicable: true, verified: false, error: "canonicalization_failed" };
    }

    var protectedB64 = claim.signature.protected;
    var payloadB64 = base64UrlEncode(payloadCanonical);
    var signingInput = new TextEncoder().encode(protectedB64 + "." + payloadB64);

    var signatureBytes;
    try {
      signatureBytes = base64UrlDecodeToBytes(claim.signature.signature);
    } catch (err) {
      return { applicable: true, verified: false, error: "signature_decode_failed" };
    }
    if (signatureBytes.length !== 64) {
      return { applicable: true, verified: false, error: "signature_wrong_length", length: signatureBytes.length };
    }

    var verified;
    try {
      verified = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        signatureBytes,
        signingInput
      );
    } catch (err) {
      return { applicable: true, verified: false, error: "verify_threw" };
    }

    return { applicable: true, verified: verified, kid: header.kid, alg: header.alg };
  }

  async function verifyAndApplyX5X6(ev, doc, urlContext) {
    var x5Current = ev.strict.find(function (c) { return c.id === "X5"; });
    var x6Current = ev.strict.find(function (c) { return c.id === "X6"; });

    if (x5Current && x5Current.status === "DEFERRED") {
      var sigResult = await verifyDocumentSignature(doc, urlContext);
      var x5Status, x5Note;
      if (!sigResult.applicable) {
        x5Status = "SKIP";
        x5Note = sigResult.reason === "no_signature"
          ? "no document-level signature present"
          : "cryptographic verification requires URL mode (origin known)";
      } else if (sigResult.verified) {
        x5Status = "PASS";
        x5Note = "signature cryptographically verified against JWKS key kid=" + sigResult.kid + " (" + sigResult.alg + ")";
      } else if (sigResult.error === "jwks_unreachable" || sigResult.error === "jwks_fetch_failed") {
        x5Status = "SKIP";
        x5Note = "could not fetch JWKS for verification: " + (sigResult.detail || sigResult.error);
      } else {
        x5Status = "FAIL";
        x5Note = "signature verification failed: " + sigResult.error + (sigResult.detail ? " (" + sigResult.detail + ")" : "");
      }
      ev.strict = ev.strict.map(function (c) {
        return c.id === "X5"
          ? check("X5", "§4.3, §5.3", "document signature cryptographically verifies", x5Status, x5Note)
          : c;
      });
      if (ev.signatureReport && ev.signatureReport.document_level) {
        ev.signatureReport.document_level.verification =
          x5Status === "PASS" ? "verified" :
          x5Status === "FAIL" ? "failed" :
          x5Status === "SKIP" ? "unverified" : null;
      }
    }

    if (x6Current && x6Current.status === "DEFERRED") {
      var claimResults = [];
      var anyFail = false, anySkip = false;
      for (var i = 0; i < doc.claims.length; i++) {
        var c = doc.claims[i];
        if (c && c.signature) {
          var cResult = await verifyClaimSignature(c, urlContext);
          claimResults.push({ index: i, claim_id: c.claim_id || null, result: cResult });
          if (cResult.applicable) {
            if (cResult.verified) {
              // verified
            } else if (cResult.error === "jwks_unreachable" || cResult.error === "jwks_fetch_failed") {
              anySkip = true;
            } else {
              anyFail = true;
            }
          } else {
            anySkip = true;
          }
        }
      }
      if (ev.signatureReport && Array.isArray(ev.signatureReport.per_claim)) {
        ev.signatureReport.per_claim.forEach(function (pc) {
          var match = claimResults.find(function (r) { return r.index === pc.index; });
          if (match) {
            if (match.result.applicable && match.result.verified) {
              pc.verification = "verified";
            } else if (match.result.applicable && !match.result.verified) {
              if (match.result.error === "jwks_unreachable" || match.result.error === "jwks_fetch_failed") {
                pc.verification = "unverified";
              } else {
                pc.verification = "failed";
              }
            } else {
              pc.verification = "unverified";
            }
          } else if (pc.presence === "absent") {
            pc.verification = null;
          }
        });
      }
      var x6Status, x6Note;
      if (anyFail) {
        x6Status = "FAIL";
        var failed = claimResults.filter(function (r) {
          return r.result.applicable && !r.result.verified
            && r.result.error !== "jwks_unreachable" && r.result.error !== "jwks_fetch_failed";
        });
        x6Note = failed.length + " per-claim signature(s) failed verification";
      } else if (anySkip) {
        x6Status = "SKIP";
        x6Note = "could not verify one or more per-claim signatures (JWKS issue)";
      } else {
        x6Status = "PASS";
        x6Note = claimResults.length + " per-claim signature(s) cryptographically verified";
      }
      ev.strict = ev.strict.map(function (c) {
        return c.id === "X6"
          ? check("X6", "§5.3", "all present per-claim signatures cryptographically verify", x6Status, x6Note)
          : c;
      });
    }

    var x1 = ev.strict.find(function (c) { return c.id === "X1"; });
    var x2 = ev.strict.find(function (c) { return c.id === "X2"; });
    var x3 = ev.strict.find(function (c) { return c.id === "X3"; });
    var x4 = ev.strict.find(function (c) { return c.id === "X4"; });
    var x5 = ev.strict.find(function (c) { return c.id === "X5"; });
    var x6 = ev.strict.find(function (c) { return c.id === "X6"; });
    var docOk = x1.status === "PASS" && x4.status === "PASS";
    if (docOk) {
      var x5Fail = x5.status === "FAIL";
      var x6Fail = x6.status === "FAIL";
      if (x5Fail && x6Fail) {
        ev.tier = "strict-invalid-both-signatures";
        ev.tierBadge = { label: "Strict (signature failures)", variant: "fail" };
      } else if (x5Fail) {
        ev.tier = "strict-invalid-signature";
        ev.tierBadge = { label: "Strict (invalid signature)", variant: "fail" };
      } else if (x6Fail) {
        ev.tier = "strict-invalid-claim-signature";
        ev.tierBadge = { label: "Strict (invalid claim signature)", variant: "fail" };
      } else if (x5.status === "SKIP" || x6.status === "SKIP") {
        ev.tier = "strict-unverified";
        ev.tierBadge = { label: "Strict (unverified)", variant: "partial" };
      } else if (x5.status === "PASS" && x6.status === "PASS" && x2.status === "PASS" && x3.status === "PASS") {
        ev.tier = "strict";
        ev.tierBadge = { label: "Strict", variant: "pass" };
      } else if (x5.status === "PASS" && x6.status === "PASS" && x2.status === "SKIP") {
        ev.tier = "strict-partial-cors";
        ev.tierBadge = { label: "Strict (partial, CORS)", variant: "partial" };
      } else {
        ev.tier = "standard";
        ev.tierBadge = { label: "Standard", variant: "pass" };
      }
    }
    return ev;
  }

  // ---- paste + URL entry points -----------------------------------------

  function runPasteValidation(text) {
    var base = baseShell("pasted input", "paste");
    var doc;
    try {
      doc = JSON.parse(text);
      base.jsonParseOk = true;
    } catch (err) {
      base.parseError = describeJsonParseError(text, err);
      base.tierBadge = { label: "None (parse error)", variant: "fail" };
      render(base);
      return;
    }
    var ok = ajvValidate(doc);
    var schemaErrors = ok ? [] : (ajvValidate.errors || []).map(function (e) {
      return { path: e.instancePath || "(root)", message: e.message || "(no message)", schemaPath: e.schemaPath };
    });
    var ev = evaluate(doc, ok, schemaErrors, null);
    base.schemaErrors = schemaErrors;
    base.checks = { minimal: ev.minimal, standard: ev.standard, strict: ev.strict };
    base.warnings = ev.warnings;
    base.confidenceInfo = ev.confidenceInfo;
    base.signatureReport = ev.signatureReport;
    base.tier = ev.tier; base.tierBadge = ev.tierBadge;
    render(base);
  }

  function runUrlValidation(raw) {
    if (!raw) return;
    var scheme = /^https?:\/\//i.exec(raw);
    if (!scheme) {
      var prepended = "https://" + raw;
      showUrlConfirm(raw, prepended);
      return;
    }
    if (scheme[0].toLowerCase() === "http://") {
      var b = baseShell(raw, "url");
      b.parseError = "The URL starts with http:// but §2.3 of the spec requires HTTPS. Retry with https://.";
      b.tierBadge = { label: "None (HTTPS required)", variant: "fail" };
      render(b);
      return;
    }
    var host;
    try { host = new URL(raw).hostname; }
    catch (_e) {
      var b2 = baseShell(raw, "url");
      b2.parseError = 'The input "' + raw + '" is not a valid URL. Enter a domain such as example.com.';
      b2.tierBadge = { label: "None (invalid URL)", variant: "fail" };
      render(b2);
      return;
    }
    fetchAndValidate(host);
  }

  function showUrlConfirm(original, prepended) {
    var banner = document.getElementById("url-confirm");
    document.getElementById("url-confirm-msg").textContent =
      'The input "' + original + '" has no scheme. Did you mean ' + prepended + "?";
    banner.hidden = false; banner.classList.remove("hidden");
    var btn = document.getElementById("btn-url-confirm-yes");
    btn.textContent = "Yes, use " + prepended;
    // replace listener idempotently
    btn.onclick = function () {
      hideUrlConfirm();
      try { fetchAndValidate(new URL(prepended).hostname); } catch (_e) {}
    };
  }
  function hideUrlConfirm() {
    var banner = document.getElementById("url-confirm");
    banner.hidden = true; banner.classList.add("hidden");
  }

  function fetchAndValidate(host) {
    var fetchedUrl = "https://" + host + WELL_KNOWN;
    var base = baseShell(fetchedUrl, "url");
    fetch(fetchedUrl, { cache: "no-store", redirect: "follow" }).then(function (resp) {
      if (resp.status === 404) {
        base.parseError =
          "No document found at " + fetchedUrl + ". The server returned HTTP 404. " +
          "Verify the document exists at exactly that path; §2.1 of the spec requires the canonical discovery path /.well-known/llmo.json.";
        base.tierBadge = { label: "None (404)", variant: "fail" };
        render(base); return;
      }
      if (!resp.ok) {
        base.parseError = "The request to " + fetchedUrl + " returned HTTP " + resp.status + ". Verify the document exists at that path and is served over HTTPS with a 2xx response.";
        base.tierBadge = { label: "None (HTTP " + resp.status + ")", variant: "fail" };
        render(base); return;
      }
      var ct = (resp.headers.get("Content-Type") || "").toLowerCase();
      return resp.text().then(function (text) {
        if (ct.indexOf("text/html") >= 0) {
          base.parseError =
            "The response from " + fetchedUrl + " has Content-Type " + ct + ", not application/json. " +
            "This usually means the server is serving its website homepage at that path instead of a JSON document, which indicates the llmo.json has not been deployed. " +
            "Verify the file exists and is served with Content-Type application/llmo+json or application/json per §2.2.";
          base.tierBadge = { label: "None (HTML response)", variant: "fail" };
          render(base); return;
        }
        var doc;
        try { doc = JSON.parse(text); base.jsonParseOk = true; }
        catch (err) {
          base.parseError = describeJsonParseError(text, err);
          base.tierBadge = { label: "None (parse error)", variant: "fail" };
          render(base); return;
        }
        var ok = ajvValidate(doc);
        var schemaErrors = ok ? [] : (ajvValidate.errors || []).map(function (e) {
          return { path: e.instancePath || "(root)", message: e.message || "(no message)", schemaPath: e.schemaPath };
        });
        // hostname is an alias of primaryDomainHost; both point at the same string. The alias exists so verifyDocumentSignature can read urlContext.hostname without a rename.
        var urlContext = { fetchedUrl: fetchedUrl, primaryDomainHost: host, hostname: host };
        var ev = evaluate(doc, ok, schemaErrors, urlContext);
        Promise.resolve(ev.tier === "strict-pending-jwks" ? finalizeStrictForUrlMode(ev, doc, urlContext) : ev).then(function (finalEv) {
          base.schemaErrors = schemaErrors;
          base.checks = { minimal: finalEv.minimal, standard: finalEv.standard, strict: finalEv.strict };
          base.warnings = finalEv.warnings;
          base.confidenceInfo = finalEv.confidenceInfo;
          base.signatureReport = finalEv.signatureReport;
          base.tier = finalEv.tier; base.tierBadge = finalEv.tierBadge;
          render(base);
        });
      });
    }).catch(function (err) {
      base.parseError =
        "The request to " + fetchedUrl + " failed before a response was received. " +
        "This could indicate a DNS failure, a network connectivity issue, a TLS handshake failure, " +
        "that the domain does not exist, or that the browser blocked the request for CORS reasons. " +
        "If you have the document locally, download it and paste its contents into the textarea above. " +
        "Underlying error: " + (err && err.message ? err.message : err);
      base.tierBadge = { label: "None (network or CORS)", variant: "fail" };
      render(base);
    });
  }

  function baseShell(source, mode) {
    return {
      source: source, mode: mode, jsonParseOk: false, parseError: null,
      schemaErrors: [], checks: { minimal: [], standard: [], strict: [] },
      warnings: [], confidenceInfo: [], signatureReport: { document_level: { presence: "absent", verification: null }, per_claim: [] },
      tier: "none", tierBadge: { label: "None", variant: "fail" }
    };
  }

  function describeJsonParseError(text, err) {
    var msg = (err && err.message) || "parse error";
    var m = /position\s+(\d+)/i.exec(msg);
    var loc = "";
    if (m) {
      var pos = parseInt(m[1], 10);
      var before = text.slice(0, pos);
      var line = (before.match(/\n/g) || []).length + 1;
      var col = pos - (before.lastIndexOf("\n") + 1) + 1;
      var bad = text.charAt(pos) || "(end of input)";
      loc = " at line " + line + ", column " + col + ' (character ' + pos + ', "' + bad + '")';
    }
    return "The input could not be parsed as JSON.\n" +
      "Parse error" + loc + ": " + msg + ".\n" +
      "Verify that your llmo.json is syntactically valid JSON. You can validate JSON syntax independently at jsonlint.com or with `jq . < your-file.json` on the command line.";
  }

  // ---- rendering --------------------------------------------------------

  function el(tag, opts, children) {
    var e = document.createElement(tag);
    if (opts) {
      if (opts.cls) e.className = opts.cls;
      if (opts.text != null) e.textContent = opts.text;
      if (opts.html != null) e.innerHTML = opts.html;
      if (opts.id) e.id = opts.id;
      if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) { e.setAttribute(k, opts.attrs[k]); });
    }
    if (children) children.forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function markFor(status) {
    if (status === "PASS") return { ch: "\u2713", cls: "mark-pass" }; // ✓
    if (status === "FAIL") return { ch: "\u2717", cls: "mark-fail" }; // ✗
    if (status === "SKIP" || status === "DEFERRED") return { ch: "\u2298", cls: "mark-skip" }; // ⊘
    if (status === "WARN") return { ch: "\u26a0", cls: "mark-warn" }; // ⚠
    return { ch: "", cls: "" };
  }

  function renderChecks(checks) {
    var ul = el("ul", { cls: "checks" });
    if (!checks || checks.length === 0) {
      ul.appendChild(el("li", { cls: "muted", text: "Not evaluated (prior tier did not pass)." }));
      return ul;
    }
    checks.forEach(function (c) {
      var mk = markFor(c.status);
      var li = el("li");
      li.appendChild(el("span", { cls: "mark " + mk.cls, text: mk.ch }));
      li.appendChild(el("span", { cls: "cite", text: "[" + c.status + "] " + c.cite + " (" + c.id + "): " }));
      li.appendChild(el("span", { text: c.desc }));
      if (c.note) {
        li.appendChild(el("div", { cls: "note", text: "note: " + c.note }));
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function firstFailingReason(checks, map) {
    if (!checks) return null;
    for (var i = 0; i < checks.length; i++) {
      var c = checks[i];
      if (c.status === "FAIL" && map[c.id]) return map[c.id];
    }
    return null;
  }

  var STRICT_REASONS = {
    X1: "the document-level signature is absent or structurally invalid",
    X4: "no canonical_urls claim has a URL on the entity's owned domain"
  };
  var STANDARD_REASONS = {
    S1: "no canonical_urls claim is present",
    S2: "no official_channels claim is present",
    S3: "entity.primary_domain does not match the serving domain",
    S4: "one or more claim URLs do not resolve to the entity's owned domain or an explicit third-party pointer",
    S5: "the validity window exceeds the 180-day Standard-tier threshold"
  };
  var MINIMAL_REASONS = {
    M3: "the input does not conform to the LLMO v0.1 schema",
    M4: 'llmo_version is not "0.1"',
    M5: "the validity window is malformed or exceeds 365 days",
    M6: "one or more claims is missing type or statement"
  };

  function parseErrorShortReason(label) {
    if (!label) return "The input could not be processed.";
    if (label.indexOf("parse error") >= 0) return "The input is not valid JSON.";
    if (label.indexOf("(404)") >= 0) return "The document was not found at the expected URL.";
    if (label.indexOf("HTTPS required") >= 0) return "The URL must use HTTPS.";
    if (label.indexOf("invalid URL") >= 0) return "The input is not a valid URL.";
    if (label.indexOf("HTML response") >= 0) return "The server returned HTML rather than JSON.";
    if (label.indexOf("network or CORS") >= 0) return "The fetch failed due to network error or CORS restriction.";
    if (/\(HTTP \d+\)/.test(label)) return "The server returned an error HTTP status.";
    return "The input could not be processed.";
  }

  function buildSummaryLine(result) {
    var tier = result.tier;
    if (tier === "strict") return "This document meets Strict conformance and its signature cryptographically verifies against the publisher's JWKS.";
    if (tier === "strict-invalid-signature") {
      return "This document is structurally Strict, but its document-level signature does not verify against the publisher's JWKS. The signature attests to nothing.";
    }
    if (tier === "strict-unverified") {
      return "This document is structurally Strict, but cryptographic signature verification could not be completed (no signature present, paste mode, or JWKS could not be fetched).";
    }
    if (tier === "strict-paste") {
      return "The document passes every Strict-tier check that does not require a live server fetch. X2, X3, and X5 (JWKS retrievability, Cache-Control, and signature verification) could not be evaluated in this mode.";
    }
    if (tier === "strict-partial-cors") {
      return "The document passes every Strict-tier check that could be evaluated. X2 and X3 could not be evaluated because the JWKS URL did not permit cross-origin requests from llmo.org/validator/.";
    }
    if (tier === "standard") {
      var reason = firstFailingReason(result.checks && result.checks.strict, STRICT_REASONS) || "a Strict-tier check failed";
      return "This document meets Standard conformance. It does not meet Strict because " + reason + ".";
    }
    if (tier === "minimal") {
      var reason = firstFailingReason(result.checks && result.checks.standard, STANDARD_REASONS) || "a Standard-tier check failed";
      return "This document meets Minimal conformance. It does not meet Standard because " + reason + ".";
    }
    // tier === "none"
    if (!result.jsonParseOk) {
      return "This document does not meet any conformance tier. " + parseErrorShortReason(result.tierBadge && result.tierBadge.label);
    }
    if (result.schemaErrors && result.schemaErrors.length > 0) {
      return "This document does not meet any conformance tier. The input does not conform to the LLMO v0.1 schema.";
    }
    var reason = firstFailingReason(result.checks && result.checks.minimal, MINIMAL_REASONS);
    if (reason) {
      return "This document does not meet any conformance tier. " + reason.charAt(0).toUpperCase() + reason.slice(1) + ".";
    }
    return "This document does not meet any conformance tier.";
  }

  function render(result) {
    var section = document.getElementById("results-section");
    section.hidden = false; section.classList.remove("hidden");
    var body = document.getElementById("results-body");
    body.innerHTML = "";

    // tier badge
    var badgeWrap = el("div");
    var badge = el("span", {
      cls: "tier-badge tier-" + (result.tierBadge.variant || "none"),
      text: result.tierBadge.label
    });
    badgeWrap.appendChild(badge);
    var summary = buildSummaryLine(result);
    if (summary) badgeWrap.appendChild(el("p", { cls: "tier-summary", text: summary }));
    badgeWrap.appendChild(el("div", { cls: "tier-sub", text: "Source: " + result.source }));
    body.appendChild(badgeWrap);

    if (result.parseError) {
      body.appendChild(el("div", { cls: "errbox", text: result.parseError }));
      body.appendChild(renderPlainTextBlock(result));
      return;
    }

    body.appendChild(el("h3", { text: "Minimal tier (§5.1)" }));
    body.appendChild(renderChecks(result.checks.minimal));
    body.appendChild(el("h3", { text: "Standard tier (§5.2)" }));
    body.appendChild(renderChecks(result.checks.standard));
    body.appendChild(el("h3", { text: "Strict tier (§5.3)" }));
    body.appendChild(renderChecks(result.checks.strict));

    if (result.schemaErrors && result.schemaErrors.length > 0) {
      body.appendChild(el("h3", { text: "Schema violations" }));
      var ul = el("ul", { cls: "plain" });
      result.schemaErrors.forEach(function (e) {
        var li = el("li");
        var path = el("code", { text: e.path || "(root)" });
        li.appendChild(path);
        li.appendChild(document.createTextNode(": " + e.message));
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    body.appendChild(el("h3", { text: "Warnings (§5.4)" }));
    if (result.warnings.length === 0) {
      body.appendChild(el("p", { cls: "muted", text: "None." }));
    } else {
      var wul = el("ul", { cls: "plain" });
      result.warnings.forEach(function (w) {
        var mk = markFor("WARN");
        var li = el("li");
        li.appendChild(el("span", { cls: "mark " + mk.cls, text: mk.ch }));
        li.appendChild(el("span", { cls: "cite", text: "[WARN] " + w.cite + " (" + w.id + "): " }));
        li.appendChild(el("span", { text: w.desc }));
        wul.appendChild(li);
      });
      body.appendChild(wul);
    }

    body.appendChild(el("h3", { text: "Confidence annotations (informational, per §3.7)" }));
    if (result.confidenceInfo.length === 0) {
      body.appendChild(el("p", { cls: "muted", text: "All claims carry authoritative confidence (default)." }));
    } else {
      var cul = el("ul", { cls: "plain" });
      result.confidenceInfo.forEach(function (c) {
        var label = c.claim_id ? '"' + c.claim_id + '" (index ' + c.index + ")" : "index " + c.index;
        cul.appendChild(el("li", { text: "claim " + label + ": " + c.confidence }));
      });
      body.appendChild(cul);
      body.appendChild(el("p", { cls: "muted", text: "Per §3.7: provisional confidence should be used sparingly. No action required; this is informational." }));
    }

    body.appendChild(el("h3", { text: "Signature" }));
    var docLevel = result.signatureReport.document_level;
    var docLine = "Document-level: <strong>" + escapeHtml(docLevel.presence) + "</strong>";
    if (docLevel.verification) {
      docLine += " (" + escapeHtml(docLevel.verification) + ")";
    }
    body.appendChild(el("p", { html: docLine }));
    if (result.signatureReport.per_claim.length > 0) {
      var pul = el("ul", { cls: "plain" });
      result.signatureReport.per_claim.forEach(function (pc) {
        var lbl = pc.claim_id ? '"' + pc.claim_id + '"' : "index " + pc.index;
        var line = "claim " + lbl + " (" + pc.type + "): " + pc.presence;
        if (pc.verification) {
          line += " (" + pc.verification + ")";
        }
        pul.appendChild(el("li", { text: line }));
      });
      body.appendChild(pul);
    } else {
      body.appendChild(el("p", { cls: "muted", text: "No claims." }));
    }

    body.appendChild(renderPlainTextBlock(result));
  }

  function renderPlainTextBlock(result) {
    var wrap = el("div");
    wrap.appendChild(el("h3", { text: "Plain-text report" }));
    var row = el("div", { cls: "copyrow" });
    var btn = el("button", { cls: "secondary", text: "Copy plain-text report", attrs: { type: "button" } });
    var status = el("span", { cls: "copy-status", text: "" });
    btn.addEventListener("click", function () {
      var text = buildPlainText(result);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = "Copied.";
          setTimeout(function () { status.textContent = ""; }, 2000);
        }, function () {
          status.textContent = "Copy failed. Select the text manually.";
          setTimeout(function () { status.textContent = ""; }, 3000);
        });
      } else {
        status.textContent = "Clipboard unavailable. Select the text manually.";
      }
    });
    row.appendChild(btn);
    row.appendChild(status);
    wrap.appendChild(row);
    wrap.appendChild(el("pre", { cls: "report", text: buildPlainText(result) }));
    return wrap;
  }

  function buildPlainText(result) {
    var lines = [];
    lines.push("LLMO Conformance Report");
    lines.push("Source: " + result.source);
    lines.push("Tier achieved: " + result.tierBadge.label);
    lines.push("");
    if (!result.jsonParseOk) {
      lines.push("JSON parse: FAIL");
      lines.push(result.parseError || "(no detail)");
      return lines.join("\n");
    }
    function section(name, rows) {
      if (!rows || rows.length === 0) return;
      var overall = rows.every(function (c) { return c.status === "PASS" || c.status === "SKIP"; }) ? "PASS" : "FAIL";
      lines.push(name + ": " + overall);
      rows.forEach(function (c) {
        lines.push("  [" + c.status + "] " + c.cite + " (" + c.id + "): " + c.desc);
        if (c.note) lines.push("         note: " + c.note);
      });
      lines.push("");
    }
    section("Minimal tier", result.checks.minimal);
    section("Standard tier", result.checks.standard);
    section("Strict tier", result.checks.strict);
    if (result.schemaErrors && result.schemaErrors.length > 0) {
      lines.push("Schema violations:");
      result.schemaErrors.forEach(function (e) { lines.push("  " + (e.path || "(root)") + ": " + e.message + " (" + e.schemaPath + ")"); });
      lines.push("");
    }
    lines.push("Warnings: " + (result.warnings.length === 0 ? "none" : ""));
    result.warnings.forEach(function (w) { lines.push("  [WARN] " + w.cite + " (" + w.id + "): " + w.desc); });
    lines.push("");
    lines.push("Confidence annotations (informational, per §3.7):");
    if (result.confidenceInfo.length === 0) {
      lines.push("  All claims carry authoritative confidence (default).");
    } else {
      result.confidenceInfo.forEach(function (c) {
        var lbl = c.claim_id ? '"' + c.claim_id + '" (index ' + c.index + ")" : "index " + c.index;
        lines.push("  - claim " + lbl + ": " + c.confidence);
      });
      lines.push("  Per §3.7: provisional confidence should be used sparingly. No action required; this is informational.");
    }
    lines.push("");
    lines.push("Signature:");
    var pdocLevel = result.signatureReport.document_level;
    var pdocLine = "  Document-level: " + pdocLevel.presence;
    if (pdocLevel.verification) {
      pdocLine += " (" + pdocLevel.verification + ")";
    }
    lines.push(pdocLine);
    if (result.signatureReport.per_claim.length === 0) {
      lines.push("  Per-claim: no claims");
    } else {
      result.signatureReport.per_claim.forEach(function (pc) {
        var lbl = pc.claim_id ? '"' + pc.claim_id + '"' : "index " + pc.index;
        var line = "  Per-claim " + lbl + " (" + pc.type + "): " + pc.presence;
        if (pc.verification) {
          line += " (" + pc.verification + ")";
        }
        lines.push(line);
      });
    }
    return lines.join("\n");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
})();
