document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
        var navbarToggler = document.querySelector('.navbar-toggler');
        var navbarCollapse = document.querySelector('#navbarNav');
        var isClickInsideNavbar = navbarCollapse.contains(event.target);
        var isNavbarToggler = navbarToggler.contains(event.target);

        // Check if click is outside the navbar and the navbar is open
        if (!isClickInsideNavbar && !isNavbarToggler && navbarCollapse.classList.contains('show')) {
            navbarToggler.click(); // Close the navbar
        }
    });
});
