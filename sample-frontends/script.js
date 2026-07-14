const titles = {
  discover: "Discover rides",
  create: "Create pool",
  "my-pools": "Manage my pools",
  auth: "Account & verification",
  admin: "Moderation",
};

const state = {
  user: null,
  pools: [],
  myPools: { created: [], joined: [] },
  myTab: "created",
  otpEmail: "",
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function toast(message, type = "success") {
  const element = $("#toast");
  element.textContent = message;
  element.className = `toast is-visible ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.className = "toast"; }, 3800);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function busy(button, work) {
  if (!button) return work();
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Please wait…";
  try { return await work(); }
  finally { button.disabled = false; button.textContent = label; }
}

function formatDate(value, includeDate = true) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    ...(includeDate ? { day: "numeric", month: "short" } : {}),
    hour: "numeric", minute: "2-digit",
  }).format(date);
}

function relativeDeparture(value) {
  const minutes = Math.max(0, Math.round((new Date(value) - Date.now()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return `${hours}h${remainder ? ` ${remainder}m` : ""}`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function setDefaultDeparture() {
  const input = $("#create-form [name='departureAt']");
  const minimum = new Date(Date.now() + 15 * 60000);
  const suggested = new Date(Date.now() + 4 * 60 * 60000);
  const localValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  input.min = localValue(minimum);
  if (!input.value) input.value = localValue(suggested);
}

function updateUserUi() {
  const userArea = $("#user-area");
  const authLabel = $("#auth-nav-label");
  const adminNav = $(".admin-nav");
  adminNav.hidden = state.user?.role !== "admin";
  authLabel.textContent = state.user ? "Profile" : "Sign in";
  if (!state.user) {
    userArea.innerHTML = '<button class="ghost-button compact-button" data-go="auth">Sign in</button>';
  } else {
    const initials = (state.user.fullName || state.user.email).split(/[ .@]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
    userArea.innerHTML = `<button class="user-chip" data-go="auth" title="Open profile"><span class="avatar">${escapeHtml(initials)}</span><span><strong>${escapeHtml(state.user.fullName || "Complete profile")}</strong><small>${state.user.premium ? "Premium · " : ""}${escapeHtml(state.user.rollNumber || state.user.email)}</small></span></button>`;
  }
  $$(".auth-required").forEach((item) => { item.hidden = Boolean(state.user?.profileComplete); });
  $("#create-form button[type='submit']").disabled = !state.user?.profileComplete;
  $("#create-campus").value = state.user?.campus || "Complete your profile";
  renderAuth();
}

function renderAuth() {
  const signedOut = $("#signed-out-auth");
  const profile = $("#profile-form");
  signedOut.hidden = Boolean(state.user);
  profile.hidden = !state.user;
  if (!state.user) return;
  $("#profile-heading").textContent = state.user.profileComplete ? "Your profile" : "Complete your profile";
  $(".profile-email").textContent = `${state.user.email} · college email verified`;
  for (const name of ["fullName", "rollNumber", "phone", "department", "campus", "gender"]) {
    if (profile.elements[name]) profile.elements[name].value = state.user[name] || (name === "campus" ? "Coimbatore" : "");
  }
}

async function navigate(screenName) {
  let next = screenName;
  if (["create", "my-pools"].includes(next) && !state.user?.profileComplete) {
    next = "auth";
    toast(state.user ? "Complete your profile to continue." : "Sign in to continue.", "info");
  }
  if (next === "admin" && state.user?.role !== "admin") {
    next = "discover";
    toast("Administrator access is required.", "error");
  }
  $$("[data-screen]").forEach((button) => button.classList.toggle("is-active", button.dataset.screen === next));
  $$(".screen").forEach((screen) => screen.classList.toggle("is-visible", screen.id === next));
  $("#screen-title").textContent = titles[next];
  history.replaceState(null, "", `#${next}`);
  if (next === "my-pools" && state.user?.profileComplete) await loadMyPools();
  if (next === "admin" && state.user?.role === "admin") await loadAdmin();
  if (next === "create") setDefaultDeparture();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function poolCard(pool) {
  const soon = new Date(pool.departureAt) - Date.now() < 5 * 60 * 60 * 1000;
  const unavailable = pool.seatsAvailable < 1;
  let action = "";
  if (pool.isHost) action = '<button class="ghost-button" data-go="my-pools">Manage</button>';
  else if (pool.joined) action = '<button class="ghost-button" data-go="my-pools">Joined · view</button>';
  else action = `<button class="solid-button" data-action="join" data-id="${pool.id}" ${unavailable ? "disabled" : ""}>${unavailable ? "Pool full" : "Join pool"}</button>`;
  const notes = pool.notes ? `<p class="ride-notes" hidden>${escapeHtml(pool.notes)}</p>` : "";
  return `
    <article class="ride-card ${soon ? "is-featured is-soon" : ""}">
      <div class="ride-status">
        ${soon ? `<span class="badge urgent">Leaving in ${relativeDeparture(pool.departureAt)}</span>` : ""}
        <span class="badge ${unavailable ? "warning" : "success"}">${unavailable ? "Full" : `${pool.seatsAvailable} seat${pool.seatsAvailable === 1 ? "" : "s"} left`}</span>
        ${pool.womenOnly ? '<span class="badge rose">Women only</span>' : ""}
        <span class="badge neutral">${pool.host.phoneVisible ? "Contact visible" : "Contact after join"}</span>
      </div>
      <div class="route ${soon ? "" : "compact"}">
        <div><span class="route-dot"></span><p>${escapeHtml(pool.origin)}</p><small>${formatDate(pool.departureAt, false)}</small></div>
        <div><span class="route-dot end"></span><p>${escapeHtml(pool.destination)}</p><small>${formatDate(pool.departureAt)}</small></div>
      </div>
      <div class="ride-meta">
        <div><span>Host</span><strong>${escapeHtml(pool.host.rollNumber || pool.host.name || "Verified student")}</strong></div>
        <div><span>Fare share</span><strong>₹${pool.costPerPerson}</strong></div>
        <div><span>Phone</span><strong>${escapeHtml(pool.host.phone)}</strong></div>
      </div>
      ${notes}
      <div class="ride-footer">
        <span class="trust ${pool.host.phoneVerified ? "verified" : "caution"}">${pool.host.phoneVerified ? "Verified contact" : "Contact not phone-verified"}</span>
        ${pool.notes ? '<button class="ghost-button" data-action="details">Details</button>' : ""}
        ${action}
      </div>
    </article>`;
}

function renderPools() {
  const list = $("#rides-list");
  if (!state.pools.length) {
    list.innerHTML = '<div class="empty-state"><span>No matches</span><h3>No active rides match those filters</h3><p>Try a broader route or date, or publish the first pool.</p><button class="solid-button" data-go="create">Create a pool</button></div>';
  } else {
    list.innerHTML = state.pools.map(poolCard).join("");
  }
  const first = state.pools[0];
  $("#next-departure").textContent = first ? relativeDeparture(first.departureAt) : "No rides yet";
  $("#next-route").textContent = first ? `${first.origin} to ${first.destination}` : "Create a pool to get the network moving";
  $("#pulse-route").textContent = first ? `${first.origin} to ${first.destination}` : "Live campus network";
  $("#pulse-fastest").textContent = first ? formatDate(first.departureAt, false) : "—";
  $("#pulse-fare").textContent = state.pools.length ? `₹${Math.round(state.pools.reduce((sum, pool) => sum + pool.costPerPerson, 0) / state.pools.length)}` : "—";
  $("#pulse-seats").textContent = state.pools.length ? state.pools.reduce((sum, pool) => sum + pool.seatsAvailable, 0) : "—";
}

async function loadPools(params = new URLSearchParams()) {
  $("#rides-list").innerHTML = '<div class="loading-card">Loading available rides…</div>';
  try {
    const data = await api(`/api/pools${params.size ? `?${params}` : ""}`);
    state.pools = data.pools;
    renderPools();
  } catch (error) {
    $("#rides-list").innerHTML = `<div class="empty-state"><h3>Rides could not be loaded</h3><p>${escapeHtml(error.message)}</p><button class="ghost-button" data-action="retry-pools">Try again</button></div>`;
  }
}

function manageCard(pool, type) {
  const active = pool.status === "active" && new Date(pool.departureAt) > Date.now();
  if (type === "created") {
    const members = pool.members.length
      ? pool.members.map((member) => `<span title="${escapeHtml(member.fullName)} · ${escapeHtml(member.phone)}">${escapeHtml(member.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2))}</span>`).join("")
      : '<strong>No riders yet</strong>';
    return `<article class="manage-card ${active ? "" : "subdued"}"><span class="badge ${active ? "success" : "neutral"}">${escapeHtml(pool.status)}</span><h3>${escapeHtml(pool.origin)} to ${escapeHtml(pool.destination)}</h3><p>${pool.joinedCount} joined · ${pool.seatsAvailable} seats left · ${formatDate(pool.departureAt)}</p><div class="member-strip">${members}</div><div class="card-actions">${active ? `<button class="danger-button" data-action="cancel" data-id="${pool.id}">Cancel pool</button>` : ""}</div></article>`;
  }
  return `<article class="manage-card ${active ? "" : "subdued"}"><span class="badge warning">Joined</span><h3>${escapeHtml(pool.origin)} to ${escapeHtml(pool.destination)}</h3><p>${formatDate(pool.departureAt)} · ${pool.seatsAvailable} seats left</p><div class="contact-box"><span>Host contact</span><strong>${escapeHtml(pool.host.phone)}</strong></div><div class="card-actions"><button class="ghost-button" data-action="report" data-id="${pool.id}">Report</button>${active ? `<button class="danger-button" data-action="leave" data-id="${pool.id}">Leave pool</button>` : ""}</div></article>`;
}

function renderMyPools() {
  const pools = state.myPools[state.myTab];
  $$("[data-my-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.myTab === state.myTab));
  $("#my-pools-list").innerHTML = pools.length
    ? pools.map((pool) => manageCard(pool, state.myTab)).join("")
    : `<div class="empty-state"><h3>No ${state.myTab} pools yet</h3><p>${state.myTab === "created" ? "Publish a ride and it will appear here." : "Join a ride from Discover and it will appear here."}</p><button class="solid-button" data-go="${state.myTab === "created" ? "create" : "discover"}">${state.myTab === "created" ? "Create pool" : "Discover rides"}</button></div>`;
}

async function loadMyPools() {
  $("#my-pools-list").innerHTML = '<div class="loading-card">Loading your pools…</div>';
  try {
    state.myPools = await api("/api/my-pools");
    renderMyPools();
  } catch (error) { toast(error.message, "error"); }
}

async function loadAdmin() {
  $("#admin-queue").innerHTML = '<div class="loading-card">Loading moderation queue…</div>';
  try {
    const data = await api("/api/admin");
    $("#metric-pools").textContent = data.metrics.activePools;
    $("#metric-reports").textContent = data.metrics.openReports;
    $("#metric-users").textContent = data.metrics.users;
    $("#metric-premium").textContent = data.metrics.premium;
    $("#admin-queue").innerHTML = data.reports.length ? `
      <div class="queue-row queue-head"><span>Status</span><span>Issue</span><span>Reporter</span><span>Action</span></div>
      ${data.reports.map((report) => `<div class="queue-row"><span class="badge ${report.status === "open" ? "danger" : "neutral"}">${escapeHtml(report.status)}</span><p><strong>${escapeHtml(report.origin)} → ${escapeHtml(report.destination)}</strong><br>${escapeHtml(report.reason)}</p><strong>${escapeHtml(report.reporterRollNumber)}</strong><div>${report.status === "open" ? `<button class="solid-button" data-action="resolve-report" data-id="${report.id}">Resolve</button> <button class="ghost-button" data-action="dismiss-report" data-id="${report.id}">Dismiss</button>` : "Reviewed"}</div></div>`).join("")}`
      : '<div class="empty-state"><h3>All clear</h3><p>There are no reports in the moderation queue.</p></div>';
  } catch (error) { toast(error.message, "error"); }
}

async function hydrate() {
  try {
    const [auth] = await Promise.all([api("/api/auth/me"), loadPools()]);
    state.user = auth.user;
  } catch { state.user = null; }
  updateUserUi();
  const requested = location.hash.slice(1);
  await navigate(titles[requested] ? requested : "discover");
}

document.addEventListener("click", async (event) => {
  const go = event.target.closest("[data-go], [data-screen]");
  if (go) {
    event.preventDefault();
    await navigate(go.dataset.go || go.dataset.screen);
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = Number(action.dataset.id);
  try {
    if (action.dataset.action === "details") {
      const notes = action.closest(".ride-card").querySelector(".ride-notes");
      notes.hidden = !notes.hidden;
      action.textContent = notes.hidden ? "Details" : "Hide details";
    } else if (action.dataset.action === "retry-pools") await loadPools();
    else if (action.dataset.action === "join") {
      if (!state.user?.profileComplete) return navigate("auth");
      await busy(action, async () => { const data = await api(`/api/pools/${id}/join`, { method: "POST" }); toast(data.message); await loadPools(); });
    } else if (action.dataset.action === "cancel") {
      if (!confirm("Cancel this pool? Joined riders will no longer see it as active.")) return;
      const data = await api(`/api/pools/${id}/cancel`, { method: "PATCH", body: "{}" }); toast(data.message); await Promise.all([loadMyPools(), loadPools()]);
    } else if (action.dataset.action === "leave") {
      if (!confirm("Leave this pool?")) return;
      const data = await api(`/api/pools/${id}/membership`, { method: "DELETE" }); toast(data.message); await Promise.all([loadMyPools(), loadPools()]);
    } else if (action.dataset.action === "report") {
      const reason = prompt("What should the safety team review? Please include at least 8 characters.");
      if (!reason) return;
      const data = await api(`/api/pools/${id}/reports`, { method: "POST", body: JSON.stringify({ reason }) }); toast(data.message);
    } else if (["resolve-report", "dismiss-report"].includes(action.dataset.action)) {
      const status = action.dataset.action === "resolve-report" ? "resolved" : "dismissed";
      const data = await api(`/api/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); toast(data.message); await loadAdmin();
    }
  } catch (error) {
    if (error.status === 401) { state.user = null; updateUserUi(); navigate("auth"); }
    toast(error.message, "error");
  }
});

$("#search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const params = new URLSearchParams([...form].filter(([, value]) => value));
  if (form.get("date")) params.set("timezoneOffset", String(new Date().getTimezoneOffset()));
  await busy(event.submitter, () => loadPools(params));
});

$("#filter-button").addEventListener("click", () => { navigate("discover"); setTimeout(() => $("#search-form input").focus(), 0); });

$("#create-form").addEventListener("input", (event) => {
  const form = event.currentTarget;
  $("#preview-route").textContent = `${form.elements.origin.value || "Your origin"} to ${form.elements.destination.value || "your destination"}`;
  const date = form.elements.departureAt.value ? formatDate(form.elements.departureAt.value) : "Date · time";
  $("#preview-meta").textContent = `${date} · ${form.elements.totalSeats.value || 1} seats`;
});

$("#create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const payload = {
    ...values,
    departureAt: new Date(values.departureAt).toISOString(),
    totalSeats: Number(values.totalSeats),
    costPerPerson: Number(values.costPerPerson),
    womenOnly: form.elements.womenOnly.checked,
    premiumContactVisible: form.elements.premiumContactVisible.checked,
    coRiderContactsVisible: form.elements.coRiderContactsVisible.checked,
  };
  try {
    await busy(event.submitter, async () => {
      const data = await api("/api/pools", { method: "POST", body: JSON.stringify(payload) });
      toast(data.message); form.reset(); setDefaultDeparture(); await loadPools(); await navigate("my-pools");
    });
  } catch (error) { toast(error.message, "error"); }
});

$("#otp-request-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(event.currentTarget).get("email");
  try {
    await busy(event.submitter, async () => {
      const data = await api("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ email }) });
      state.otpEmail = email.trim().toLowerCase();
      const verify = $("#otp-verify-form");
      verify.querySelector("button").disabled = false;
      if (data.devCode) {
        verify.elements.code.value = data.devCode;
        $("#otp-helper").textContent = `Local-only code: ${data.devCode}. Email delivery has not been configured.`;
      } else $("#otp-helper").textContent = data.message;
      verify.elements.code.focus(); toast(data.message);
    });
  } catch (error) { toast(error.message, "error"); }
});

$("#otp-verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.otpEmail) return toast("Request a verification code first.", "error");
  const code = new FormData(event.currentTarget).get("code");
  try {
    await busy(event.submitter, async () => {
      const data = await api("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ email: state.otpEmail, code }) });
      state.user = data.user; updateUserUi(); await loadPools(); toast("College email verified. You’re signed in.");
    });
  } catch (error) { toast(error.message, "error"); }
});

$("#profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await busy(event.submitter, async () => {
      const data = await api("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
      state.user = data.user; updateUserUi(); toast(data.message); await navigate("discover");
    });
  } catch (error) { toast(error.message, "error"); }
});

$("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    state.user = null;
    state.myPools = { created: [], joined: [] };
    updateUserUi();
    await loadPools();
    toast("Signed out.");
    await navigate("discover");
  } catch (error) { toast(error.message, "error"); }
});

$$(`[data-my-tab]`).forEach((button) => button.addEventListener("click", () => { state.myTab = button.dataset.myTab; renderMyPools(); }));

setDefaultDeparture();
hydrate();
