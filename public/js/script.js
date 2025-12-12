// Handle tab clicks
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    this.classList.add('active');
    
    // Navigate to the selected role
    const href = this.getAttribute('href');
    if (href) {
      window.location.href = href;
    }
  });
});

// Highlight current page tab on page load
document.addEventListener('DOMContentLoaded', function() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.tab-button').forEach(button => {
    if (button.getAttribute('href') === currentPath) {
      button.classList.add('active');
    }
  });
});
