export const MOORCHEH_API_URL = 'https://api.moorcheh.ai/v1';

export async function createNamespace(namespace: string) {
  const response = await fetch(`${MOORCHEH_API_URL}/namespaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MOORCHEH_API_KEY || ''
    },
    body: JSON.stringify({ namespace_name: namespace, type: 'text' })
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Proceed even if it fails (e.g. if it already exists)
    console.warn(`Moorcheh create namespace (${namespace}) returned:`, response.status, errorText);
  }
}

export async function uploadToMoorcheh(namespace: string, chunks: { id: string; text: string; metadata?: any }[]) {
  // Placeholder implementation for uploading documents
  // Create the namespace path
  const response = await fetch(`${MOORCHEH_API_URL}/namespaces/${namespace}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MOORCHEH_API_KEY || ''
    },
    body: JSON.stringify({ documents: chunks })
  });
  
  if (!response.ok) {
    console.error("Moorcheh upload failed", await response.text());
    throw new Error("Failed to upload to Moorcheh");
  }
  return response.json();
}

export async function askMoorcheh(namespace: string, query: string, topK: number = 5, threshold: number = 0.65) {
  const response = await fetch(`${MOORCHEH_API_URL}/namespaces/${namespace}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MOORCHEH_API_KEY || ''
    },
    body: JSON.stringify({
      query,
      top_k: topK,
      threshold,
      kiosk_mode: true
    })
  });

  if (!response.ok) {
    throw new Error("Failed to get answer from Moorcheh");
  }
  return response.json();
}

export async function searchMoorcheh(namespace: string, query: string, topK: number = 3, threshold: number = 0.7) {
  const response = await fetch(`${MOORCHEH_API_URL}/namespaces/${namespace}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MOORCHEH_API_KEY || ''
    },
    body: JSON.stringify({
      query,
      top_k: topK,
      threshold
    })
  });

  if (!response.ok) {
    throw new Error("Failed to search Moorcheh");
  }
  return response.json();
}
