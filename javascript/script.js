// Function to remove the 'active' class from all nav links
function removeActiveClass() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });
}

// Add event listeners to nav links to change the active class on click
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function (event) {
    removeActiveClass(); // Remove 'active' from all links
    event.target.classList.add("active"); // Add 'active' to the clicked link
  });
});
