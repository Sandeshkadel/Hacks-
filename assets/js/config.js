// Global App Config: toggle real integrations or leave in mock mode.
window.AppConfig = {
  email: {
    // Set to true and configure provider to use EmailJS; otherwise uses mock outbox.
    enabled: false,
    provider: 'emailjs',
    adminEmail: 'admin@club.local',
    // EmailJS config (optional)
    emailjs: {
      service_id: 'your_service_id',
      template_id: 'your_template_id',
      public_key: 'your_public_key'
    }
  },
  payment: {
    donationLink: 'https://donate.stripe.com/test_12345'
  },
  zoom: {
    enabled: false,
    // You must implement these endpoints on your server if enabling
    apiBase: 'https://your-server.example.com/api/zoom'
  }
};