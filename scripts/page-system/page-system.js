/*
function openPage(page){

	let pages = document.getElementsByClassName("page");
	if(document.getElementById("fadeCover").style["opacity"] == 1 || document.getElementById("fadeCover").style["opacity"] == ""){
        for(let i = 0; i < pages.length; i++) {
            document.getElementById(pages[i].id).style["display"] = "none";
        }
        document.getElementById(page).style["display"] = null;
        fade("fadeCover",FADESPEED,"out");
        return 0;
    }
    fade("fadeCover",FADESPEED,"in",function(){
        document.documentElement.scrollTop = 0;
        for(let i = 0; i < pages.length; i++) {
            document.getElementById(pages[i].id).style["display"] = "none";
        }
        document.getElementById(page).style["display"] = null;
        fade("fadeCover",FADESPEED,"out");
    });
    
}

function hideAllPages(){

	let pages = document.getElementsByClassName("page");
	for(let i = 0; i < pages.length; i++){
		document.getElementById(pages[i].id).style["display"] = null;
	}
}


function fancyReload(){
    fade("fadeCover",FADESPEED,"in",function(){
        location.reload();
    });
}


openPage("landingPage");*/