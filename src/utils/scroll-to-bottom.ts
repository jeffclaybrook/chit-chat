export function scrollToBottom() {
 const el = document.getElementById("scroll-bottom-anchor")

 if (el) {
  el.scrollIntoView({ behavior: "smooth", block: "end" })
 }
}