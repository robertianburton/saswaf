function setNavbar() {
	var path = $(location).attr('pathname');
	$( '.navbar-nav a' ).each(function() {
	    var href = $(this).attr('href');
	    if (path == href) {
	        $(this).addClass('active');
	    }
	});
}

$( document ).ready(function() {
    console.log( "ready!" );
    setNavbar();
});