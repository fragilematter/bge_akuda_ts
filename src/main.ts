import { decodeInternetCode, findCodeInSave } from './decoder.js';

document.addEventListener('DOMContentLoaded', () => {
    const internetCode = document.getElementById('internetCode') as HTMLInputElement;
    const decodeBtn = document.getElementById('decodeBtn') as HTMLButtonElement;
    const fileInput = document.getElementById('saveFile') as HTMLInputElement;
    const dropZone = document.getElementById('dropZone') as HTMLDivElement;
    
    const errorDiv = document.getElementById('error') as HTMLDivElement;
    const engResult = document.getElementById('engResult') as HTMLSpanElement;
    const rusResult = document.getElementById('rusResult') as HTMLSpanElement;

    function showError(msg: string) {
        errorDiv.textContent = msg;
        errorDiv.style.display = msg ? 'block' : 'none';
    }

    function clearResults() {
        showError('');
        engResult.textContent = '—';
        rusResult.textContent = '—';
    }

    function processInternetCode(code: string) {
        if (code.length !== 16) {
            showError("Code must be exactly 16 characters.");
            return;
        }

        try {
            const res = decodeInternetCode(code);
            engResult.textContent = res.englishCode;
            rusResult.textContent = res.russianCode;
        } catch (e: any) {
            showError(e.message || "An error occurred parsing code.");
        }
    }

    function processFile(file: File | undefined) {
        clearResults();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) {
                showError("Could not open file.");
                return;
            }

            const res = findCodeInSave(buffer);
            if (!res || !res.englishCode) {
                showError("Invalid file (too small).");
                return;
            }

            engResult.textContent = res.englishCode;
            rusResult.textContent = res.russianCode;
        };

        reader.onerror = () => showError("Error reading file.");
        reader.readAsArrayBuffer(file);
    }

    // internet code region
    
    decodeBtn.addEventListener('click', () => {
        clearResults();
        const code = internetCode.value.trim();
        processInternetCode(code);
    });


    // save file upload region
    
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        processFile(file);
    });

    // browsers try to open the file
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => e.preventDefault(), false);
    });

    // Highlight drop zone on hover
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt?.files[0];
        
        if (file && fileInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
        }
        
        processFile(file);
    });
});
