(function (Drupal, once) {
    console.log('PRICING SLIDER JS LOADED');

    Drupal.behaviors.pricingSlider = {
        attach(context) {
            once(
                'pricing-slider',
                '#pricing-splide',
                context
            ).forEach((el) => {

                console.log('Pricing slider JavaScript attached, Splide is:', typeof Splide);

                new Splide(el).mount();

            });
        }
    };

})(Drupal, once);
