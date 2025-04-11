async function fetchSecretOpt() {
    const response = await fetch('https://api.graf.land/get-secret-opt');
    if (!response.ok) {
        throw new Error('Failed to fetch secret opt');
    }
    const data = await response.json();
    return data.secret_opt || 'default_secret';  // Return the secret or fallback to default
}

document.getElementById('verify-button').addEventListener('click', async function () {
    const originalFile = document.getElementById('original-file').files[0];
    const vgtiFile = document.getElementById('vgti-file').files[0];

    if (!originalFile || !vgtiFile) {
        alert("Please upload both the original document and the .vgti file.");
        return;
    }

    const originalFileReader = new FileReader();
    const vgtiFileReader = new FileReader();

    // Read the original file
    originalFileReader.onloadend = async function () {
        const fileHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(originalFileReader.result)).toString(CryptoJS.enc.Hex);

        // After reading the original file, read the .vgti file
        vgtiFileReader.onloadend = async function () {
            try {
                const vgtiContent = JSON.parse(vgtiFileReader.result);

                // Extract fields from .vgti file, especially the stored slot number
                const { nickname, slotNumber, email } = vgtiContent;

                // Fetch the secret from the backend
                const secretOpt = await fetchSecretOpt();

                // Use the slot number from the .vgti file instead of fetching a new one
                const violet_id = hashVioletID(nickname, fileHash, slotNumber, secretOpt);

                // Check the Violet ID with the backend
                const response = await fetch(`https://api.graf.land/check-violet-id/${violet_id}`, {
                    method: 'GET'
                });

                const result = await response.json();

                // Handle the verification result
                if (result.status === 'found') {
                    const cExplorerLink = `https://preprod.cexplorer.io/tx/${result.transaction_id}`;
                    const cardanoScanLink = `https://preprod.cardanoscan.io/transaction/${result.transaction_id}`;

                    document.getElementById('result').innerHTML = `
                        <p class="success">File Verified <span>✔️</span></p>
                        <p>Transaction ID: ${result.transaction_id}</p>
                        <a href="${cExplorerLink}" target="_blank" class="proceed-link">View on CExplorer</a>
                        <a href="${cardanoScanLink}" target="_blank" class="proceed-link">View on Cardanoscan</a>
                        <a href="https://docs.graf.land" class="proceed-link">Return to Sign Document</a>
                    `;
                } else {
                    document.getElementById('result').innerHTML = `
                        <p class="fail">File Not Verified <span>❌</span></p>
                    `;
                }
            } catch (error) {
                console.error("Error parsing .vgti file or verifying file:", error);
                document.getElementById('result').innerText = "An error occurred during verification.";
            }
        };

        // Read .vgti file as text
        vgtiFileReader.readAsText(vgtiFile);
    };

    // Read original file as ArrayBuffer
    originalFileReader.readAsArrayBuffer(originalFile);
});

// Function to hash Violet ID based on the same protocol as signing
function hashVioletID(nickname, fileHash, slotNumber, secretOpt) {
    const context = "Document-Signing-App";
    const identityContext = localStorage.getItem('userEmail') || 'user@example.com';  // Identity context
    const slotStr = slotNumber.toString().slice(-3);  // Last 3 digits of slot number

    const combined = `${context}${identityContext}${nickname}${fileHash}${slotStr}+"Azmvd24612mnlbxeda3742751az421911234"`;
    return CryptoJS.SHA256(combined).toString(CryptoJS.enc.Hex);  // Generate the final Violet ID
}
