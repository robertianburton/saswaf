function setNavbar() {

	var url = location.href.split("/");
	var navLinks = document.getElementsByClassName("nav-link");
	var i = 0;
	var currentPage = url[url.length - 1];
	for (i; i < navLinks.length; i++) {
		var pageCode = navLinks[i].href.split("/");
		if (pageCode[pageCode.length - 1] == currentPage) {
			navLinks[i].className = navLinks[i].className + " active";
		};
	};
};

document.addEventListener("DOMContentLoaded", function (event) {
	console.log("Common JS Starting Up...");
	setNavbar();
	console.log("Common JS Startup Complete.");
});