(function (Drupal, once) {
    console.log("CONTACT TEST JS")

    Drupal.behaviors.contactTest = {
        attach(context) {

            once(
                'contact-test',
                '.contact-test-button',
                context
            ).forEach((button) => {

                console.log('Contact SDC JavaScript attached');

                button.addEventListener('click', () => {
                    alert('Contact SDC JavaScript is working!');
                });

            });

        }
    };

})(Drupal, once);