window.onload = function() {
    for (let i = 0; i < document.getElementsByClassName("game-mode").length; i++) {
        $('.game-mode').eq(i).delay(i*100).hide().fadeIn(1000);
        if (i+1 === document.getElementsByClassName("game-mode").length) {
            $('.earth').css('animation', 'fadeInUp 1s ease-in-out');
        }
    }

    $(document).mouseover(function (e){
        let c = ($(e.target).attr('class'));
        if (c === 'game-mode') {
            let html = $(e.target).text();
            $(e.target).html('<i class="fa fa-location-dot"></i> ' + html);
        }
    });

    $(document).mouseout(function (e){
        let c = ($(e.target).attr('class'));
        if (c === 'game-mode') {
            let html = $(e.target).html();
            $(e.target).html(html.replace('<i class="fa fa-location-dot"></i> ', ''));
        }
    });
}