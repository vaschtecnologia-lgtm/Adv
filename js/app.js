document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const promptInput = document.getElementById('prompt-input');
  const fileInput = document.getElementById('file-input');
  const generateBtn = document.getElementById('generate-btn');
  const outputDiv = document.getElementById('output');
  const modelSelect = document.getElementById('model-select');
  const previewContainer = document.getElementById('preview-container');

  let selectedFileBase64 = null;
  let selectedFileMimeType = null;

  // Load saved API Key from localStorage
  const savedKey = localStorage.getItem('gemini_playground_key');
  if (savedKey && apiKeyInput) {
    apiKeyInput.value = savedKey;
  }

  // Handle file preview
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedFileMimeType = file.type;
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedFileBase64 = event.target.result.split(',')[1];
        if (previewContainer) {
          previewContainer.innerHTML = '';
          if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.className = 'max-h-48 rounded-lg shadow border border-slate-700/50 object-contain';
            previewContainer.appendChild(img);
          } else {
            const fileDoc = document.createElement('div');
            fileDoc.className = 'p-3 bg-slate-800 rounded-lg text-slate-300 text-xs flex items-center gap-2';
            fileDoc.innerHTML = `<span>📎</span> <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>`;
            previewContainer.appendChild(fileDoc);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle generation
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      const model = modelSelect ? modelSelect.value : 'gemini-2.5-flash';

      if (!prompt) {
        alert('Por favor, digite uma instrução ou prompt!');
        return;
      }

      // Save API Key if provided
      if (apiKey) {
        localStorage.setItem('gemini_playground_key', apiKey);
      }

      generateBtn.disabled = true;
      generateBtn.textContent = 'Gerando...';
      outputDiv.innerHTML = '<span class="text-slate-500 animate-pulse font-mono">Processando requisição com a API do Gemini...</span>';

      try {
        // Construct standard payload for the Gemini API
        const contents = [];
        
        const parts = [{ text: prompt }];
        if (selectedFileBase64 && selectedFileMimeType) {
          parts.push({
            inlineData: {
              mimeType: selectedFileMimeType,
              data: selectedFileBase64
            }
          });
        }

        contents.push({ parts });

        // Call client-side or backend endpoint proxy
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contents })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Erro da API: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta retornada do modelo.';
        
        // Simple Markdown-to-HTML parser for rendering the response beautifully
        outputDiv.innerHTML = formatMarkdown(responseText);
      } catch (error) {
        outputDiv.innerHTML = `<div class="p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-lg text-xs">
          <strong>Erro na geração:</strong> ${error.message}
          <p class="mt-2 text-[10px] text-red-500">Certifique-se de que sua Chave de API está correta e ativa no Google AI Studio.</p>
        </div>`;
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Gerar Resposta';
      }
    });
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">$1</code>')
      .replace(/\n/g, '<br/>');
  }
});
