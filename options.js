// Load current key when opening settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['typesafe_key'], (result) => {
    if (result.typesafe_key) {
      document.getElementById('apiKey').value = result.typesafe_key;
    }
  });
});

// Save key locally inside user's private browser database
document.getElementById('save').addEventListener('click', () => {
  const key = document.getElementById('apiKey').value.trim();
  chrome.storage.local.set({ typesafe_key: key }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 2000);
  });
});
