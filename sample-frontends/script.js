const titles = {
  discover: "Discover rides",
  create: "Create pool",
  "my-pools": "Manage my pools",
  auth: "Verify access",
  admin: "Moderation",
};

const buttons = document.querySelectorAll("[data-screen]");
const screens = document.querySelectorAll(".screen");
const title = document.querySelector("#screen-title");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.screen;

    buttons.forEach((item) => item.classList.toggle("is-active", item === button));
    screens.forEach((screen) => {
      screen.classList.toggle("is-visible", screen.id === next);
    });

    title.textContent = titles[next];
  });
});
