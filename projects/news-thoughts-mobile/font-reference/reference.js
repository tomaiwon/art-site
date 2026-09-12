(() => {
  const names = {
    plex: "A · IBM Plex Mono Light",
    dm: "B · DM Mono Light",
    inconsolata: "C · Inconsolata Light",
  };
  const specimen = document.querySelector(".specimen");
  const name = document.getElementById("font-name");
  document.querySelectorAll('input[name="font"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      specimen.dataset.font = input.value;
      name.textContent = names[input.value];
    });
  });
})();
