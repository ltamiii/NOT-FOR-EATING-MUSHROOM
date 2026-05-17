document.addEventListener('DOMContentLoaded', () => {
  const liquid = document.querySelector(".liquid");
  const pageLoading = document.querySelector(".page-loading");
  const pageTarget = document.querySelector(".page-target");

  const transitionMs = 1250;
  const holdMs = 120;

  const start = () => {
    liquid.classList.add("active");

    let phase = "rising";
    const onTransformEnd = (e) => {
      if (e.propertyName !== "transform") return;

      if (phase === "rising") {
        pageLoading.classList.add("hide");
        pageTarget.classList.add("show");

        phase = "falling";
        setTimeout(() => {
          liquid.classList.remove("active");
        }, holdMs);
        return;
      }

      pageLoading.remove();
      liquid.removeEventListener("transitionend", onTransformEnd);
      liquid.remove();
    };

    liquid.addEventListener("transitionend", onTransformEnd);

    setTimeout(() => {
      if (phase !== "rising") return;
      pageLoading.classList.add("hide");
      pageTarget.classList.add("show");
      phase = "falling";
      setTimeout(() => {
        liquid.classList.remove("active");
      }, holdMs);
    }, transitionMs + 80);

    setTimeout(() => {
      if (phase !== "falling") return;
      pageLoading.remove();
      liquid.removeEventListener("transitionend", onTransformEnd);
      liquid.remove();
    }, transitionMs * 2 + holdMs + 250);
  };

  setTimeout(start, 200);
});
