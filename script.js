const navItems = [
  ["welcome","⌂","Welcome"],
  ["invitation","✉","Invitation"],
  ["beginning","♡","Beginning"],
  ["moments","▧","Gallery"],
  ["events","◫","Events"],
  ["countdown","◷","Countdown"]
];

const bottomNav = document.getElementById("bottomNav");
const drawerNav = document.getElementById("drawerNav");

// Always begin a fresh invitation at the welcome page.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
function openAtWelcome(){
  window.scrollTo({top:0,left:0,behavior:"auto"});
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
  setTimeout(()=>window.scrollTo({top:0,left:0,behavior:"auto"}),100);
}
openAtWelcome();
window.addEventListener("load", openAtWelcome);
window.addEventListener("pageshow", openAtWelcome);

// Keep visitors on the welcome screen until they tap the invite button.
let introUnlocked = false;
let invitationLandingScrollY = null;

function preventLockedScroll(event) {
  if (!introUnlocked) {
    event.preventDefault();
  }
}

function preventLockedKeys(event) {
  if (introUnlocked) {
    return;
  }

  const blockedKeys = [
    "ArrowDown",
    "PageDown",
    "Space",
    "End",
    "Home"
  ];

  if (blockedKeys.includes(event.code) || blockedKeys.includes(event.key)) {
    event.preventDefault();
  }
}

window.addEventListener("wheel", preventLockedScroll, { passive: false });
window.addEventListener("touchmove", preventLockedScroll, { passive: false });
window.addEventListener("keydown", preventLockedKeys);

const inviteLetterTrigger = document.getElementById("openInviteLetter");

function openInvitationFromLetter() {
  if (introUnlocked) {
    return;
  }

  introUnlocked = true;
  inviteLetterTrigger?.classList.add("open");

  window.setTimeout(function () {
    document.getElementById("invitation")?.scrollIntoView({ behavior: "smooth" });
  }, 360);

  window.setTimeout(function () {
    invitationLandingScrollY = window.scrollY;
  }, 1050);
}

inviteLetterTrigger?.addEventListener("click", openInvitationFromLetter);
inviteLetterTrigger?.addEventListener("keydown", function (event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openInvitationFromLetter();
  }
});

navItems.forEach(([id, icon, label]) => {
  const b = document.createElement("button");
  b.dataset.target = id;
  b.innerHTML = `<span class="nav-icon">${icon}</span><span>${label}</span>`;
  b.onclick = () => document.getElementById(id).scrollIntoView({behavior:"smooth"});
  if (bottomNav) bottomNav.appendChild(b);

  const d = b.cloneNode(true);
  d.onclick = () => {
    document.getElementById(id).scrollIntoView({behavior:"smooth"});
    document.getElementById("drawer").classList.remove("open");
  };
  drawerNav.appendChild(d);
});

document.querySelectorAll("[data-scroll]").forEach(btn=>{
  btn.addEventListener("click",()=>document.getElementById(btn.dataset.scroll).scrollIntoView({behavior:"smooth"}));
});

const sections = [...document.querySelectorAll(".screen")];
const navButtons = bottomNav ? [...bottomNav.querySelectorAll("button")] : [];
const observer = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      navButtons.forEach(b=>b.classList.toggle("active",b.dataset.target===entry.target.id));
    }
  });
},{threshold:.45});
sections.forEach(s=>observer.observe(s));

const drawer=document.getElementById("drawer");
document.getElementById("menuBtn").onclick=()=>drawer.classList.add("open");
document.getElementById("closeMenu").onclick=()=>drawer.classList.remove("open");

// Web Audio API gives a sample-accurate, gapless loop (no crossfade hacks needed).
let musicOn=false, starting=false;
let audioCtx=null, sourceNode=null, audioBuffer=null, loadingPromise=null;
const MUSIC_SRC=document.getElementById("bgMusic")?.getAttribute("src")||"assets/wedding-music.mp3";

function getAudioCtx(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    // Some browsers only resolve a blocked resume() once a *later* user
    // gesture unlocks the context; this catches that instead of hanging.
    audioCtx.onstatechange=()=>{
      musicOn=!!sourceNode && audioCtx.state==="running";
      syncMusicUI();
    };
  }
  return audioCtx;
}
function loadBuffer(){
  if(audioBuffer) return Promise.resolve(audioBuffer);
  if(!loadingPromise){
    loadingPromise=fetch(MUSIC_SRC)
      .then(r=>r.arrayBuffer())
      .then(data=>getAudioCtx().decodeAudioData(data))
      .then(buf=>{audioBuffer=buf;return buf;});
  }
  return loadingPromise;
}
function startSource(){
  const ctx=getAudioCtx();
  sourceNode=ctx.createBufferSource();
  sourceNode.buffer=audioBuffer;
  sourceNode.loop=true;
  sourceNode.loopStart=0;
  sourceNode.loopEnd=audioBuffer.duration;
  sourceNode.connect(ctx.destination);
  sourceNode.start(0);
}
function stopSource(){
  if(sourceNode){
    try{sourceNode.stop();}catch(e){}
    sourceNode.disconnect();
    sourceNode=null;
  }
}
async function ensurePlaying(){
  if(starting) return;
  starting=true;
  const ctx=getAudioCtx();
  // Fire-and-forget: call resume() while still inside the gesture call stack
  // so mobile browsers count it as user-activated, but never block on it —
  // some browsers leave it pending until a later gesture instead of rejecting.
  if(ctx.state==="suspended") ctx.resume().catch(()=>{});
  try{
    await loadBuffer();
    if(!sourceNode) startSource();
  }catch(e){
    // Fetch/decode failed; a later tap will retry via the listener below.
  }
  starting=false;
  musicOn=ctx.state==="running";
  syncMusicUI();
}
function stopPlaying(){
  stopSource();
  musicOn=false;
  syncMusicUI();
}
function toggleMusic(){
  if(musicOn) stopPlaying();
  else ensurePlaying();
}
function syncMusicUI(){
  const btn=document.getElementById("musicBtn");
  const cta=document.getElementById("musicCta");
  btn.textContent=musicOn?"♫":"♪";
  btn.setAttribute("aria-label",musicOn?"Pause music":"Play music");
  btn.classList.toggle("needs-tap",!musicOn);
  if(musicOn&&cta) cta.classList.remove("show");
}
document.getElementById("musicBtn").onclick=toggleMusic;

// Try to start as soon as the site opens; most mobile browsers block that
// without a real tap, so keep retrying on every genuine tap (not a scroll
// drag, which also fires touchstart) until it actually succeeds.
ensurePlaying();
const tryStartFromInteraction=(event)=>{
  const isMusicBtn=event.target.closest && event.target.closest("#musicBtn");
  if(isMusicBtn) return; // the button's own click handler already covers this
  if(musicOn){
    document.removeEventListener("click",tryStartFromInteraction);
    document.removeEventListener("touchend",tryStartFromInteraction);
    return;
  }
  ensurePlaying();
};
document.addEventListener("click",tryStartFromInteraction);
document.addEventListener("touchend",tryStartFromInteraction);

function stopMusicWhenPageIsHidden(){
  if(document.visibilityState==="hidden"){
    stopPlaying();
  }
}
document.addEventListener("visibilitychange",stopMusicWhenPageIsHidden);
window.addEventListener("pagehide",stopPlaying);

// Invite the visitor to tap for music since autoplay usually can't start on
// its own; the bubble hides itself once music actually starts or after a bit.
setTimeout(()=>{
  const cta=document.getElementById("musicCta");
  if(cta&&!musicOn) cta.classList.add("show");
},1200);
setTimeout(()=>{
  const cta=document.getElementById("musicCta");
  if(cta) cta.classList.remove("show");
},6000);

// Countdown: Wedding day, 25 November 2026, 12:00 local time.
const weddingDate = new Date("2026-11-25T20:00:00");
function pad(n){return String(Math.max(0,n)).padStart(2,"0")}
function updateCountdown(){
  let diff= weddingDate - new Date();
  if(diff<0) diff=0;
  const s=Math.floor(diff/1000);
  document.getElementById("days").textContent=pad(Math.floor(s/86400));
  document.getElementById("hours").textContent=pad(Math.floor(s%86400/3600));
  document.getElementById("minutes").textContent=pad(Math.floor(s%3600/60));
  document.getElementById("seconds").textContent=pad(s%60);
}
updateCountdown(); setInterval(updateCountdown,1000);

// document.getElementById("rsvpForm").addEventListener("submit",e=>{
//   e.preventDefault();
//   document.getElementById("formMessage").textContent="Thank you! Your RSVP has been recorded. ♥";
// });

function addDaysToDateString(yyyymmdd) {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// Opens Google Calendar's quick-add directly (no file download, works on both
// Android and iOS) prefilled with the Wedding day details.
function addWeddingToCalendar() {
  const start = "20261125";
  const end = addDaysToDateString(start);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Priti & Uma - Wedding",
    dates: `${start}/${end}`,
    details: "Join us as we celebrate the wedding of Priti & Uma.",
    location: "Gandoul"
  });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
}
// ===== Event-specific location modal =====

document.addEventListener("DOMContentLoaded", function () {

  const calendarBtn = document.getElementById("calendarBtn");
  if (calendarBtn) {
    calendarBtn.addEventListener("click", addWeddingToCalendar);
  }

  const KORTHU_MAP_LINK =
    "https://maps.app.goo.gl/d99sjEQfU8Z6TznYA?g_st=aw";

  const GANDOUL_MAP_LINK =
    "https://maps.app.goo.gl/zJc6gyKXY96EAmPo8?g_st=aw";

  const eventLocations = {

    shubhShagun: {
      title: "Shubh Shagun",
      date: "22 November 2026",
      venueName: "Korthu",
      address: "Korthu",
      mapLink: KORTHU_MAP_LINK
    },

    umaHaldi: {
      title: "Uma's Haldi",
      date: "23 November 2026",
      venueName: "Korthu",
      address: "Korthu",
      mapLink: KORTHU_MAP_LINK
    },

    pritiHaldi: {
      title: "Priti's Haldi & Mehendi",
      date: "24 November 2026",
      venueName: "Gandoul",
      address: "Gandoul",
      mapLink: GANDOUL_MAP_LINK
    },

    wedding: {
      title: "Wedding",
      date: "25 November 2026",
      venueName: "Gandoul",
      address: "Gandoul",
      mapLink: GANDOUL_MAP_LINK
    },

    vadhuAagman: {
      title: "Vadhu Aagman (Dwiragman)",
      date: "3 December 2026",
      venueName: "Korthu",
      address: "Korthu",
      mapLink: KORTHU_MAP_LINK
    }

  };


  // Get modal elements
  const locationModal =
    document.getElementById("location");

  const locationEventTitle =
    document.getElementById("locationEventTitle");

  const locationEventDate =
    document.getElementById("locationEventDate");

  const locationVenueName =
    document.getElementById("locationVenueName");

  const locationVenueAddress =
    document.getElementById("locationVenueAddress");

  const mapVenueLabel =
    document.getElementById("mapVenueLabel");

  const directionsBtn =
    document.getElementById("directionsBtn");

  const mapBtn =
    document.getElementById("mapBtn");


  // Safety check
  if (!locationModal) {
    console.error("Location modal #location was not found.");
    return;
  }


  let activeLocation = eventLocations.wedding;
  let locationCloseTimer;


  // ===== OPEN LOCATION MODAL =====

  function openEventLocation(key) {

    activeLocation =
      eventLocations[key] || eventLocations.wedding;

    locationEventTitle.textContent =
      activeLocation.title;

    locationEventDate.textContent =
      activeLocation.date.toUpperCase();

    locationVenueName.textContent =
      activeLocation.venueName;

    locationVenueAddress.textContent =
      activeLocation.address;

    mapVenueLabel.textContent =
      activeLocation.venueName;


    window.clearTimeout(locationCloseTimer);
    locationModal.classList.remove("closing");
    locationModal.classList.add("open");

    locationModal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.style.overflow = "hidden";
  }


  // ===== CLOSE LOCATION MODAL =====

  function closeLocation() {

    locationModal.classList.remove("open");
    locationModal.classList.add("closing");

    locationModal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style.overflow = "";

    window.clearTimeout(locationCloseTimer);
    locationCloseTimer = window.setTimeout(() => {
      locationModal.classList.remove("closing");
    }, 480);
  }


  // ===== EVENT LOCATION BUTTONS =====

  const locationButtons =
    document.querySelectorAll(".event-location-btn");

  console.log(
    "Event location buttons found:",
    locationButtons.length
  );


  locationButtons.forEach(function (button) {

    button.addEventListener("click", function () {

      const eventKey =
        button.getAttribute("data-event");

      console.log(
        "Location button clicked:",
        eventKey
      );

      openEventLocation(eventKey);

    });

  });


  // ===== CLOSE BUTTON / BACKDROP =====

  const closeButtons =
    document.querySelectorAll("[data-close-location]");

  closeButtons.forEach(function (button) {

    button.addEventListener(
      "click",
      closeLocation
    );

  });


  // ===== ESC KEY =====

  document.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Escape") {
        closeLocation();
      }

    }
  );


  // ===== GOOGLE MAP =====

  function openGoogleMaps() {

    const mapLink =
      activeLocation.mapLink || KORTHU_MAP_LINK;

    window.open(
      mapLink,
      "_blank",
      "noopener,noreferrer"
    );

  }


  // ===== GET DIRECTIONS =====

  if (directionsBtn) {

    directionsBtn.addEventListener(
      "click",
      function () {

        openGoogleMaps();

      }
    );

  }


  // ===== OPEN IN MAPS =====

  if (mapBtn) {

    mapBtn.addEventListener(
      "click",
      function () {

        openGoogleMaps();

      }
    );

  }

});
// ===== Page entrance transitions =====
const enterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting) return;
  entry.target.classList.add("is-visible");
  enterObserver.unobserve(entry.target);
}),{threshold:.15});
document.querySelectorAll(".screen").forEach(s=>enterObserver.observe(s));

// ===== Looping engagement lightbox =====
const galleryItems = [...document.querySelectorAll("#engagementGallery .photo-card")];
const gallery = document.getElementById("galleryLightbox");
const lightboxPhoto = document.getElementById("lightboxPhoto");
const lightboxCaption = document.getElementById("lightboxCaption");
let galleryIndex = 0;

function renderGalleryPhoto() {
  const image = galleryItems[galleryIndex]?.querySelector("img");
  if (!image || !lightboxPhoto || !lightboxCaption) return;

  lightboxPhoto.innerHTML = "";
  const preview = document.createElement("img");
  preview.src = image.src;
  preview.alt = image.alt;
  lightboxPhoto.appendChild(preview);
  lightboxCaption.textContent = image.alt;
}

function moveGalleryPhoto(direction) {
  if (!galleryItems.length) return;
  galleryIndex = (galleryIndex + direction + galleryItems.length) % galleryItems.length;
  renderGalleryPhoto();
}

function closeGallery() {
  gallery?.classList.remove("open");
  gallery?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

if (gallery && galleryItems.length) {
  galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      galleryIndex = index;
      renderGalleryPhoto();
      gallery.classList.add("open");
      gallery.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });

  document.getElementById("galleryClose")?.addEventListener("click", closeGallery);
  document.getElementById("galleryPrev")?.addEventListener("click", () => moveGalleryPhoto(-1));
  document.getElementById("galleryNext")?.addEventListener("click", () => moveGalleryPhoto(1));
  gallery.addEventListener("click", event => {
    if (event.target === gallery) closeGallery();
  });
  document.addEventListener("keydown", event => {
    if (!gallery.classList.contains("open")) return;
    if (event.key === "Escape") closeGallery();
    if (event.key === "ArrowLeft") moveGalleryPhoto(-1);
    if (event.key === "ArrowRight") moveGalleryPhoto(1);
  });
}

// // ===== Gallery lightbox with touch swipe =====

// const galleryItems = [
//   ...document.querySelectorAll("#engagementGallery .photo-card")
// ];

// const gallery = document.getElementById("galleryLightbox");
// const lightboxPhoto = document.getElementById("lightboxPhoto");
// const lightboxCaption = document.getElementById("lightboxCaption");

// const galleryClose = document.getElementById("galleryClose");
// const galleryPrev = document.getElementById("galleryPrev");
// const galleryNext = document.getElementById("galleryNext");

// let galleryIndex = 0;

// const galleryCaptions = [
//   "Engagement — a beautiful beginning",
//   "A moment to remember",
//   "Together, with family",
//   "The first chapter",
//   "A beautiful day"
// ];

// function renderGallery() {

//   if (!galleryItems.length) return;

//   const item = galleryItems[galleryIndex];

//   const img = item.querySelector("img");

//   if (img) {

//     lightboxPhoto.innerHTML = "";

//     const newImg = document.createElement("img");

//     newImg.src = img.src;
//     newImg.alt = img.alt;

//     newImg.style.maxWidth = "100%";
//     newImg.style.maxHeight = "80vh";
//     newImg.style.objectFit = "contain";

//     lightboxPhoto.appendChild(newImg);

//   }

//   lightboxCaption.textContent =
//     galleryCaptions[galleryIndex] ||
//     item.querySelector("img")?.alt ||
//     "Priti & Uma";
// }

// function openGallery(index) {

//   galleryIndex = index;

//   renderGallery();

//   gallery.classList.add("open");

//   gallery.setAttribute(
//     "aria-hidden",
//     "false"
//   );

//   document.body.style.overflow = "hidden";
// }

// function closeGallery() {

//   gallery.classList.remove("open");

//   gallery.setAttribute(
//     "aria-hidden",
//     "true"
//   );

//   document.body.style.overflow = "";
// }

// function showPreviousGalleryPhoto() {

//   galleryIndex =
//     (galleryIndex - 1 + galleryItems.length) %
//     galleryItems.length;

//   renderGallery();
// }

// function showNextGalleryPhoto() {

//   galleryIndex =
//     (galleryIndex + 1) %
//     galleryItems.length;

//   renderGallery();
// }


// // Small photo click
// galleryItems.forEach((item, index) => {

//   item.addEventListener("click", function(event) {

//     // Don't open lightbox when an arrow is clicked
//     if (event.target.closest(".gallery-arrow")) {
//       return;
//     }

//     openGallery(index);

//   });

// });


// // Lightbox buttons
// if (galleryClose) {
//   galleryClose.addEventListener(
//     "click",
//     closeGallery
//   );
// }

// if (galleryPrev) {
//   galleryPrev.addEventListener(
//     "click",
//     showPreviousGalleryPhoto
//   );
// }

// if (galleryNext) {
//   galleryNext.addEventListener(
//     "click",
//     showNextGalleryPhoto
//   );
// }


// // Keyboard controls
// document.addEventListener("keydown", e => {

//   if (!gallery.classList.contains("open")) {
//     return;
//   }

//   if (e.key === "Escape") {
//     closeGallery();
//   }

//   if (e.key === "ArrowLeft") {
//     showPreviousGalleryPhoto();
//   }

//   if (e.key === "ArrowRight") {
//     showNextGalleryPhoto();
//   }

// });


// // Touch swipe
// let touchX = 0;

// gallery.addEventListener(
//   "touchstart",
//   e => {
//     touchX = e.changedTouches[0].clientX;
//   },
//   { passive: true }
// );

// gallery.addEventListener(
//   "touchend",
//   e => {

//     const dx =
//       e.changedTouches[0].clientX - touchX;

//     if (Math.abs(dx) > 45) {

//       if (dx < 0) {
//         showNextGalleryPhoto();
//       } else {
//         showPreviousGalleryPhoto();
//       }

//     }

//   },
//   { passive: true }
// );

// // ===== RSVP + wishes: local storage prototype =====
// const RSVP_KEY="pritiUma_rsvp"; const WISH_KEY="pritiUma_wishes";
// function loadWishes(){const saved=JSON.parse(localStorage.getItem(WISH_KEY)||"[]");const box=document.querySelector(".wishes");saved.slice(-8).reverse().forEach(w=>{const article=document.createElement("article");article.innerHTML=`${escapeHtml(w.message)}<span>— ${escapeHtml(w.name||"A well-wisher")} ♥</span>`;box.appendChild(article)})}
// function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
// loadWishes();
// document.getElementById("wishForm").addEventListener("submit",e=>{e.preventDefault();const ta=e.target.querySelector("textarea"),input=e.target.querySelector("input");const wishes=JSON.parse(localStorage.getItem(WISH_KEY)||"[]");wishes.push({message:ta.value.trim(),name:input.value.trim(),at:Date.now()});localStorage.setItem(WISH_KEY,JSON.stringify(wishes));e.target.reset();alert("Your blessing has been saved on this device ♥")});
// document.getElementById("rsvpForm").addEventListener("submit",e=>{e.preventDefault();const data={attendance:e.target.attendance.value,guests,food:e.target.querySelector("select").value,at:Date.now()};localStorage.setItem(RSVP_KEY,JSON.stringify(data));document.getElementById("formMessage").textContent="Thank you! Your RSVP has been saved on this device. ♥"});

// ===== Fresh video invitation share =====
function normalizeRecipientName(value){
  return Array.from(value.replace(/\s+/g," ").trim()).slice(0,100).join("");
}

function buildInvitationMessage(value){
  const name=normalizeRecipientName(value);
  return [
    "\uD83D\uDC90 Priti & Uma \u2014 Wedding Invitation \uD83D\uDC90",
    "",
    name ? `Dear ${name},` : "Dear Friends and Family,",
    "",
    "25 November 2026",
    "",
    "With hearts full of love and joy, we are delighted to invite you to celebrate the wedding of Priti & Uma.",
    "Your presence will make our special day even more memorable. \u2764\uFE0F",
    "",
    "Tap to open the wedding invitation details:",
    "https://umapritiwedding.online/"
  ].join("\n");
}

const invitationShareDialog=document.createElement("dialog");
invitationShareDialog.className="invitation-share-dialog";
invitationShareDialog.setAttribute("aria-labelledby","invitationShareTitle");
invitationShareDialog.innerHTML=`
  <h2 id="invitationShareTitle">Share invitation</h2>
  <form id="invitationShareForm">
    <label for="invitationRecipient">Recipient name (optional)</label>
    <input id="invitationRecipient" type="text" autocomplete="off" placeholder="Friends and Family" aria-describedby="invitationNameHint">
    <small id="invitationNameHint">Up to 100 characters. Spaces between names are welcome.</small>
    <p id="invitationShareStatus" role="status" aria-live="polite"></p>
    <div class="invitation-share-actions">
      <button type="button" id="cancelInvitationShare">Cancel</button>
      <button type="button" id="retryInvitationVideo" hidden>Retry video</button>
      <button type="submit" id="chooseInvitationApp" disabled>Choose app</button>
    </div>
  </form>`;
document.body.appendChild(invitationShareDialog);
const invitationRecipient=document.getElementById("invitationRecipient");
const invitationShareStatus=document.getElementById("invitationShareStatus");
const chooseInvitationApp=document.getElementById("chooseInvitationApp");
const retryInvitationVideo=document.getElementById("retryInvitationVideo");
let currentInvitationFile=null;
let invitationFetchController=null;
let invitationSharePending=false;

async function prepareInvitationVideo(){
  invitationFetchController?.abort();
  const controller=new AbortController();
  invitationFetchController=controller;
  currentInvitationFile=null;
  chooseInvitationApp.disabled=true;
  retryInvitationVideo.hidden=true;
  if(!navigator.share || !navigator.canShare){
    invitationShareStatus.textContent="Video sharing is unavailable in this browser. Open the invitation in a browser with file sharing support, such as Chrome on Android or Safari on iPhone.";
    return;
  }
  invitationShareStatus.textContent="Preparing invitation video...";
  const timeout=setTimeout(()=>controller.abort(),60000);
  try{
    const url=new URL("assets/invitation%20video.mp4",document.baseURI);
    const response=await fetch(url,{cache:"no-store",signal:controller.signal});
    if(!response.ok) throw new Error("Video download failed");
    const blob=await response.blob();
    if(!blob.size || (blob.type && !/^(video\/mp4|application\/octet-stream)(;|$)/i.test(blob.type))){
      throw new Error("Invalid video response");
    }
    const file=new File([blob],"Priti-and-Uma-Wedding-Invitation.mp4",{type:"video/mp4"});
    if(controller!==invitationFetchController || !invitationShareDialog.open) return;
    if(!navigator.canShare({files:[file]})){
      invitationShareStatus.textContent="This browser cannot share the invitation video. Please try Chrome on Android or Safari on iPhone.";
      return;
    }
    currentInvitationFile=file;
    invitationShareStatus.textContent="Your invitation video is ready.";
    chooseInvitationApp.disabled=false;
  }catch(error){
    if(controller!==invitationFetchController || !invitationShareDialog.open) return;
    invitationShareStatus.textContent="The invitation video could not load. Please retry.";
    retryInvitationVideo.hidden=false;
  }finally{
    clearTimeout(timeout);
  }
}

document.getElementById("whatsappShare")?.addEventListener("click",()=>{
  if(invitationSharePending || invitationShareDialog.open) return;
  invitationRecipient.value="";
  invitationRecipient.setCustomValidity("");
  invitationShareDialog.showModal();
  prepareInvitationVideo();
});
invitationRecipient.addEventListener("input",()=>{
  const length=Array.from(invitationRecipient.value.replace(/\s+/g," ").trim()).length;
  invitationRecipient.setCustomValidity(length>100?"Please enter a name of up to 100 characters.":"");
});
document.getElementById("cancelInvitationShare").addEventListener("click",()=>invitationShareDialog.close());
invitationShareDialog.addEventListener("close",()=>{
  invitationFetchController?.abort();
  invitationFetchController=null;
  currentInvitationFile=null;
  invitationRecipient.value="";
});
retryInvitationVideo.addEventListener("click",prepareInvitationVideo);
document.getElementById("invitationShareForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(invitationSharePending || !currentInvitationFile) return;
  invitationSharePending=true;
  chooseInvitationApp.disabled=true;
  try{
    // Invoke directly from this tap: downloading here would lose user activation.
    // Always attach the video with its caption; never silently send text alone.
    await navigator.share({
      files:[currentInvitationFile],
      text:buildInvitationMessage(invitationRecipient.value)
    });
    invitationShareDialog.close();
  }catch(error){
    invitationShareStatus.textContent=error?.name==="AbortError"
      ? "Sharing cancelled. Choose an app to try again."
      : "Could not open sharing. Tap Choose app to try again.";
  }finally{
    invitationSharePending=false;
    chooseInvitationApp.disabled=!currentInvitationFile;
  }
});
/* ============================================================
   ENGAGEMENT PHOTO SWAP GALLERY
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

  const engagementGallery =
    document.getElementById("engagementGallery");

  // Stop if gallery doesn't exist
  if (!engagementGallery) {
    console.log("engagementGallery not found");
    return;
  }

  console.log("Engagement gallery loaded");

  let galleryAnimating = false;

  function updateGallery() {

    const cards = Array.from(
      engagementGallery.querySelectorAll(".photo-card")
    );

    if (cards.length === 0) {
      console.log("No photo cards found");
      return;
    }

    // Make first card the large card
    cards.forEach((card, index) => {
      card.classList.toggle("large", index === 0);
    });

    // Remove old arrows
    engagementGallery
      .querySelectorAll(".gallery-arrow")
      .forEach(arrow => arrow.remove());

    // First card = large card
    const largeCard = cards[0];

    // Previous button
    const prev = document.createElement("button");

    prev.type = "button";
    prev.className = "gallery-arrow gallery-prev";
    prev.setAttribute("aria-label", "Previous photo");
    prev.textContent = "‹";

    // Next button
    const next = document.createElement("button");

    next.type = "button";
    next.className = "gallery-arrow gallery-next";
    next.setAttribute("aria-label", "Next photo");
    next.textContent = "›";

    // Add buttons to large photo
    largeCard.appendChild(prev);
    largeCard.appendChild(next);

    // Previous
    prev.addEventListener("click", function (event) {

      event.preventDefault();
      event.stopPropagation();

      movePhoto("prev");

    });

    // Next
    next.addEventListener("click", function (event) {

      event.preventDefault();
      event.stopPropagation();

      movePhoto("next");

    });
  }


  function movePhoto(direction) {

    if (galleryAnimating) {
      return;
    }

    const cards = Array.from(
      engagementGallery.querySelectorAll(".photo-card")
    );

    if (cards.length < 2) {
      return;
    }

    galleryAnimating = true;

    if (direction === "next") {

      // Move first card to the end
      engagementGallery.appendChild(cards[0]);

    } else {

      // Move last card to the beginning
      engagementGallery.insertBefore(
        cards[cards.length - 1],
        cards[0]
      );

    }

    // Rebuild gallery
    updateGallery();

    window.setTimeout(() => {
      galleryAnimating = false;
    }, 120);
  }


  // Start gallery
  updateGallery();

});
