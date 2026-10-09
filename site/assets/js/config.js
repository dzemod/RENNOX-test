// RENNOX site configuration — fill these in before going live.
window.RENNOX_CONFIG = {
  // Google Reviews (Places API). Get the Place ID at
  // https://developers.google.com/maps/documentation/places/web-service/place-id
  // and a browser key with "Maps JavaScript API" + "Places API (New)" enabled, restricted to your domain.
  google: {
    placeId: '',
    apiKey: '',
  },

  // Where form submissions are POSTed as JSON (e.g. Formspree, Make/Zapier webhook, your CRM).
  // Left empty, the forms only show a success message — leads are NOT stored anywhere.
  formEndpoint: '',

  // SAMPLE reviews shown until the Google Place ID + API key above are set.
  // Replace them with real Google reviews (or connect the API) before launch — do not publish them as-is.
  fallbackReviews: [
    { author: 'Daniel H.', rating: 5, when: '2 weeks ago', text: 'Great experience overall! They gave us 3D designs, suggested smart improvements and delivered a premium finish. Our home is stylish, functional and personal.' },
    { author: 'Mei L.', rating: 5, when: '1 month ago', text: 'Our kitchen was finished on schedule and exactly on budget. The crew kept everything clean every single day.' },
    { author: 'James C.', rating: 5, when: '2 months ago', text: 'Spa-level bathroom, zero stress. Clear quote, weekly updates and a project manager who actually answers the phone.' },
  ],
  fallbackRating: 4.9,
  fallbackCount: '120+',
};
