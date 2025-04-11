document.getElementById('verifyForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const file = document.getElementById('file').files[0];
    const vgtiDocument = document.getElementById('vgtiDocument').files[0];
    const statusDiv = document.getElementById('status');

    if (!file || !vgtiDocument) {
        alert("Please upload both the file and the .vgti document");
        return;
    }

    // Clear status and hide initially
    statusDiv.innerHTML = ""; 
    statusDiv.style.display = 'none';  // Initially hide the status box

    try {
        // Step 1: Show status box and start process
        statusDiv.innerHTML += "<div class='status-info'>Starting verification process...</div>";
        statusDiv.style.display = 'block';  // Show the status box when the first update happens

        // Step 2: Hash the uploaded file (SHA-256)
        statusDiv.innerHTML += "<div class='status-code'>Hashing the uploaded file to create the identity context...</div>";
        const fileHash = await hashFile(file);
        statusDiv.innerHTML += `<div class='status-code'>File hash (SHA-256): ${fileHash}</div>`;

        // Step 3: Read the .vgti document (JSON)
        statusDiv.innerHTML += "<div class='status-code'>Reading and parsing the .vgti document...</div>";
        const vgtiData = await readJsonFile(vgtiDocument);
        statusDiv.innerHTML += `<div class='status-code'>Violet ID from .vgti document: ${vgtiData.violetId}</div>`;
        statusDiv.innerHTML += `<div class='status-code'>Slot number from .vgti document: ${vgtiData.slotNumber}</div>`;

        // Step 4: Verify the file hash matches the identity context
        statusDiv.innerHTML += "<div class='status-code'>Checking if the file hash matches the identity context in the .vgti document...</div>";
        if (fileHash !== vgtiData.identityContext) {
            statusDiv.innerHTML += "<div class='status-error status-code'>Error: File hash does not match the identity context in the .vgti document.</div>";
            return;
        }
        statusDiv.innerHTML += "<div class='status-success status-code'>File hash matches the identity context.</div>";

        // Step 5: Send the Violet ID to the backend for on-chain verification
        statusDiv.innerHTML += "<div class='status-code'>Sending the Violet ID to the backend for on-chain verification...</div>";
        const response = await fetch('https://api.graf.land/check-violet-id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ violet_id: vgtiData.violetId })
        });

        if (!response.ok) {
            throw new Error('Failed to check Violet ID on-chain');
        }

        const result = await response.json();
        if (result.status === 'found') {
            const txid = result.transaction_id;
            statusDiv.innerHTML += `<div class='status-success status-code'>Violet ID found on-chain!<br>Transaction ID: ${txid}</div>`;
            // Adding the Cardano block explorer link
            statusDiv.innerHTML += `<div class='status-code'>You can view this file signing transaction on a Cardano block explorer here:</div>`;
            statusDiv.innerHTML += `<a href="https://preprod.cexplorer.io/tx/${txid}" target="_blank" class="explorer-link">View transaction on Cardano Explorer</a>`;
        } else {
            statusDiv.innerHTML += "<div class='status-error status-code'>Violet ID not found on-chain.</div>";
        }

        statusDiv.innerHTML += "<div class='status-success status-code'>Verification process completed.</div>";

        // Step 6: Add a link to go back and sign another document
        statusDiv.innerHTML += `<div class='status-code'>Go back and sign another file: <a href="https://docs.graf.land/sign" target="_blank" class="status-success">https://docs.graf.land/sign</a></div>`;

    } catch (error) {
        statusDiv.innerHTML += `<div class='status-error status-code'>Error: ${error.message}</div>`;
    }
});

// Function to hash the file (SHA-256)
async function hashFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Function to read and parse a JSON file
async function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                resolve(JSON.parse(event.target.result));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}
