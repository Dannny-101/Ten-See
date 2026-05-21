/**
 * Confirmation Popup Module
 * Handles enquiry confirmation popups with reference numbers
 */

const ConfirmationPopup = {
  show(options = {}) {
    const {
      title = "Enquiry Received",
      message = "We've received your enquiry. Expect a reply within 24 hours.",
      referenceNumber = null,
      onClose = () => {}
    } = options;

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'confirmation-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      text-align: center;
      animation: slideUp 0.3s ease;
    `;

    // Success icon
    const icon = document.createElement('div');
    icon.style.cssText = `
      font-size: 3rem;
      margin-bottom: 20px;
    `;
    icon.innerHTML = '✓';
    icon.style.color = '#10B981';

    // Title
    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      color: #2C3830;
      font-size: 1.5rem;
      margin-bottom: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
    `;

    // Message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      color: #6B7280;
      font-size: 1rem;
      margin-bottom: 20px;
      line-height: 1.6;
    `;

    // Reference number (if provided)
    let refEl = null;
    if (referenceNumber) {
      refEl = document.createElement('div');
      refEl.style.cssText = `
        background: #F7F8FA;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 25px;
        border-left: 4px solid #B8954A;
      `;
      refEl.innerHTML = `
        <p style="color: #6B7280; font-size: 0.85rem; margin: 0 0 5px 0;">Reference Number</p>
        <p style="color: #2C3830; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 1.1rem; margin: 0;">${referenceNumber}</p>
      `;
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Continue';
    closeBtn.style.cssText = `
      background: #B8954A;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#A67D3A';
    closeBtn.onmouseout = () => closeBtn.style.background = '#B8954A';
    closeBtn.onclick = () => {
      backdrop.remove();
      onClose();
    };

    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    // Assemble modal
    modal.appendChild(icon);
    modal.appendChild(titleEl);
    modal.appendChild(messageEl);
    if (refEl) modal.appendChild(refEl);
    modal.appendChild(closeBtn);

    // Assemble backdrop
    backdrop.appendChild(modal);

    // Add to document
    document.body.appendChild(backdrop);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        onClose();
      }
    });
  }
};

// Export for use in HTML
window.ConfirmationPopup = ConfirmationPopup;
