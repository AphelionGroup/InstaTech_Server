function init() {
    if (typeof WebSocket == "undefined") {
        $(".portal-button-frame").remove();
        $("#divWebSocketUnavailable").show();
        return false;
    }
    try {
        InstaTech.Socket_Main = new WebSocket(location.protocol.replace("http", "ws") + "//" + InstaTech.HostAndPort + "/Services/Main_Socket.cshtml");
        setMainSocketHandlers();
        return true;
    }
    catch (ex) {
        $(".portal-button-frame").remove();
        console.log("Error initiating websocket connection: " + ex);
        $("#divWebSocketError").show();
        return false;
    }
}
function switchToTechPortal() {
    $("#divCustomerPortal").fadeOut(function () {
        $("#divTechPortal").fadeIn();
    });
}
function submitTechMainLogin(e) {
    if (e) {
        e.preventDefault();
    }
    var formData = {};
    $("#formTechMainLogin").find("input").each(function (index, item) {
        if (item.type == "checkbox") {
            formData[item.name] = item.checked;
        }
        else {
            formData[item.name] = item.value;
        }
    });
    if (InstaTech.AuthenticationToken) {
        formData["AuthenticationToken"] = InstaTech.AuthenticationToken;
    }
    InstaTech.Socket_Main.send(JSON.stringify(formData));
}
function logOutTech(e) {
    clearCachedCreds();
    InstaTech.Socket_Main.close();
}

function toggleMenu(menu) {
    var targetMenu;
    if (menu == "main") {
        targetMenu = $("#divMainMenuOuter");
    }
    else if (menu == "notify") {
        targetMenu = $("#divNotifyMenuOuter");
    }
    if (targetMenu.width() == 0) {
        targetMenu.width("initial");
        targetMenu.height("initial");
        var targetWidth = targetMenu.width();
        var targetHeight = targetMenu.height();
        targetMenu.width(0);
        targetMenu.height(0);
        targetMenu.animate({
            "width": targetWidth,
            "height": targetHeight
        }, 400);
    }
    else {
        targetMenu.animate({
            "width": 0,
            "height": 0
        }, 400);
    }
}
function mouseOutMenu(menu) {
    var targetMenu;
    if (menu == "main") {
        targetMenu = $("#divMainMenuOuter");
    }
    else if (menu == "notify") {
        targetMenu = $("#divNotifyMenuOuter");
    }
    if (targetMenu.width() == 0) {
        return;
    }
    if (InstaTech.Temp.menuTimeout) {
        window.clearTimeout(InstaTech.Temp.menuTimeout);
    }
    InstaTech.Temp.menuTimeout = window.setTimeout(function (menu) {
        if ($("#divMainMenuOuter").is(":visible") && !$("#svgMainMenu").is(":hover") && !$("#divMainMenuOuter").is(":hover")) {
            toggleMenu(menu);
        }
        delete InstaTech.Temp.menuTimeout;
    }, 2000, menu);
}
function clearCachedCreds() {
    InstaTech.UserID = null;
    InstaTech.AuthenticationToken = null;
    localStorage.removeItem("RememberMe");
    localStorage.removeItem("UserID");
    localStorage.removeItem("AuthenticationToken");
}
function setMainLoginFrame() {
    $("#spanMainLoginStatus").html("<small>Logged in as: " + InstaTech.UserID + "</small>");
    $("#aMainTechLogIn").hide();
    $("#aMainTechLogOut").show();
}
function forgotPasswordMain(e) {
    if ($("#inputTechMainUserID").val().length == 0) {
        showDialog("User ID Required", "You must first enter a user ID into the form before you can reset the password.");
        return;
    }
    var dialog = document.createElement("div");
    dialog.innerHTML = "This will reset your password and send a temporary password to your email.<br/><br/>Proceed?";
    $(dialog).dialog({
        width: document.body.clientWidth * .5,
        title: "Confirm Password Reset",
        classes: { "ui-dialog-title": "center-aligned" },
        buttons: [
            {
                text: "Yes",
                click: function () {
                    var request = {
                        "Type": "ForgotPassword",
                        "UserID": $("#inputTechMainUserID").val()
                    };
                    InstaTech.Socket_Main.send(JSON.stringify(request));
                    $(this).dialog("close");
                }
            },
            {
                text: "No",
                click: function () {
                    $(this).dialog("close");
                }
            }
        ],
        close: function () {
            $(this).dialog('destroy').remove();
        }
    });
}
function switchToCustomerPortal() {
    $("#divTechPortal").fadeOut(function () {
        $("#divCustomerPortal").fadeIn();
    });
}
// Sets the onclick event handler for .portal-option-button elements.  The element
// must have attributes "opens" and "opens-file".  "Opens-file" must be the name of the file
// that's in /Controls/ that contains the HTML for the content to be loaded.  "Opens" must
// be the ID of the first element in the content, which will be given a slideDown opening effect.
// If the "opens" element has an onload event, it will be fired.
function setPortalButtonHandlers() {
    $(".portal-option-button").click(function (e) {
        $(e.currentTarget).addClass("remove-css");
        $(e.currentTarget).css({
            "transform": "scale(.75, .75)",
            "transition-duration": ".4s",
            "transition-timing-function": "ease",
            "z-index": 2,
        });
        window.setTimeout(function () {
            $(".remove-css").attr("style", "");
            $(".remove-css").removeClass("remove-css");
        }, 500);
        var strOpens = $(e.currentTarget).attr("opens");
        if (strOpens.search("#") != 0) {
            strOpens = "#" + strOpens;
        }
        if ($(strOpens).length == 0) {
            var strFile = $(e.currentTarget).attr("opens-file");
            $.get(window.location.origin + "/Controls/" + strFile, function (data) {
                $("#divTechContent:visible, #divCustomerContent:visible").append(data);
                slideToggleContent(strOpens);
                if ($(strOpens).length > 0 && $(strOpens)[0].onload) {
                    $(strOpens)[0].onload();
                }
            });
        }
        else {
            slideToggleContent(strOpens);
        }
    });
}
function slideToggleContent(strElementIDSelector) {
    var opens = $(strElementIDSelector);
    if (opens.is(":visible")) {
        opens.slideUp();
    }
    else {
        opens.slideDown(function () {
            window.scroll(0, opens.offset().top);
        });
    }
    ;
}
function setMainSocketHandlers() {
    InstaTech.Socket_Main.onopen = function () {
        if (localStorage["RememberMe"]) {
            InstaTech.UserID = localStorage["UserID"];
            InstaTech.AuthenticationToken = localStorage["AuthenticationToken"];
            $("#inputTechMainUserID").val(InstaTech.UserID);
            $("#inputTechMainPassword").val("**********");
            document.getElementById("inputTechMainRememberMe").checked = true;
            submitTechMainLogin();
        }
    };
    InstaTech.Socket_Main.onmessage = function (e) {
        var jsonData = JSON.parse(e.data);
        eval("handle" + jsonData.Type + "(jsonData)");
    };
    InstaTech.Socket_Main.onclose = function () {
        $("#divCustomerContent").hide();
        $("#divTechContent").hide();
        $(".portal-button-frame").hide();
        $("#divWebSocketClosed").show();
        $("#divMainTechLoginFrame").remove();
    };
    InstaTech.Socket_Main.onerror = function (ex) {
        console.log("WebSocket error.");
        $("#divCustomerContent").hide();
        $("#divTechContent").hide();
        $(".portal-button-frame").hide();
        $("#divWebSocketError").show();
        $("#divMainTechLoginFrame").remove();
    };
}
function addNotification(strButtonInnerHTML, functionClickAction) {
    document.getElementById("divNotifyMenuOuter").removeAttribute("hidden");
    document.getElementById("imgNotifyMenu").removeAttribute("hidden");
    var notify = document.createElement("div");
    notify.innerHTML = strButtonInnerHTML;
    notify.classList.add("menu-option");
    notify.onclick = functionClickAction;
    document.getElementById("divNotifyMenuInner").appendChild(notify);
}
function addText(strMessage) {
    $("#textBuildMessages")[0].value += "\n" + strMessage;
    $("#textBuildMessages")[0].scrollTop = $("#textBuildMessages")[0].scrollHeight;
};

$(document).ready(function () {
    window.onerror = function (messageOrEvent, source, lineno, colno, error) {
        var ex = {};
        ex.msg = messageOrEvent;
        ex.lineno = lineno;
        ex.colno = colno;
        ex.source = source;
        ex.error = error;
        var strError = JSON.stringify(ex);
        sendClientError(strError);
    };
    if (!init()) {
        return;
    }
    window.onbeforeunload = function () {
        if (InstaTech.Socket_Main.readyState == 1 && location.host.search("localhost") == -1) {
            return "Navigating away from this page will end your current session.  Are you sure you want to leave?";
        }
    };
    $(document).ajaxStart(function () {
        showLoading();
    });
    $(document).ajaxStop(function () {
        removeLoading();
    });
    setPortalButtonHandlers();
    if (window.location.search.toLocaleLowerCase().search("user=tech") > -1)
    {
        $("#divCustomerPortal").hide();
        $("#divTechPortal").show();
    }
    if (location.protocol == "http:") {
        addNotification("SSL Error", function () {
            showDialog("Connection Not Secure", "Your connection is not secure.  SSL isn't configured properly on this server.<br/><br/>See the Quick Start and Reference guides for helpful tips on configuring SSL.");
        })
    }
});