const SLOP_THRESHOLD = 0.85;

// Layer 1: Fast Heuristic Check (Works offline without a key)
function isObviousSlop(text) {
  const buzzwords = /\b(delve|testament|transformative|tapestry|beacon|landscape|democratize|foster|multifaceted)\b/i;
  const corporateClichés = /in today's fast-paced|look no further|it's important to remember/i;
  const genericHook = /^[A-Z].*?\?\s*\n\n/m; 
  
  return buzzwords.test(text) || corporateClichés.test(text) || (genericHook.test(text) && text.includes('🚀'));
}

// Layer 2: Semantic evaluation via Jev API using stored key
async function evaluateWithJev(text, apiKey) {
  if (!apiKey) return 0; // Skip if user hasn't set an API key yet
  
  try {
    const response = await fetch("https://typesafe.ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text: text,
        schema: {
          slop_probability: "number",
          reasoning: "string"
        },
        system_prompt: "Evaluate if this corporate post lacks real information density, uses highly predictable GPT-style cadence, or lacks personal, verifiable claims."
      })
    });
    const data = await response.json();
    return data.slop_probability || 0;
  } catch (err) {
    console.error("Jev evaluation failed:", err);
    return 0;
  }
}

// Process feed nodes
async function processPost(postElement, apiKey) {
  if (postElement.dataset.processed) return;
  postElement.dataset.processed = "true";

  const textContainer = postElement.querySelector('.feed-shared-update-v2__descriptionText, .update-components-text');
  if (!textContainer) return;

  const text = textContainer.innerText;

  // Run Layer 1 (Heuristics)
  if (isObviousSlop(text)) {
    blurPost(postElement, "Heuristic Flag");
    return;
  }

  // Run Layer 2 (Jev AI)
  if (apiKey) {
    const slopScore = await evaluateWithJev(text, apiKey);
    if (slopScore >= SLOP_THRESHOLD) {
      blurPost(postElement, `AI Slop (${Math.round(slopScore * 100)}%)`);
    }
  }
}

function blurPost(element, reason) {
  element.classList.add('slop-blurred');
  
  const overlay = document.createElement('div');
  overlay.className = 'slop-overlay';
  overlay.innerHTML = `<span>Filtered: ${reason}</span> <button class="unblur-btn">View Anyway</button>`;
  
  overlay.querySelector('.unblur-btn').addEventListener('click', () => {
    element.classList.remove('slop-blurred');
    overlay.remove();
  });
  
  element.style.position = 'relative';
  element.appendChild(overlay);
}

// Retrieve the securely stored API key from storage before starting
chrome.storage.local.get(['typesafe_key'], (result) => {
  const apiKey = result.typesafe_key || null;

  // Observe dynamic DOM changes as the user scrolls
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          const posts = node.querySelectorAll('.feed-shared-update-v2, [data-urn]');
          posts.forEach(post => processPost(post, apiKey));
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
