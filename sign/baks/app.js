let fileInput;  // Global variable for the file input
let nickname;   // Global variable for the nickname input
let transactionId;  // Store the transaction ID globally
let fileHash;   // Store the file hash globally
let slotNumber; // Store the slot number from Cardano blockchain

async function fetchSlotNumber() {
    const response = await fetch('https://api.graf.land/tip');
    if (!response.ok) {
        throw new Error('Failed to fetch slot number');
    }
    const data = await response.json();
    return data.slot || 0;  // Return the slot number or fallback to 0
}
// Hash Violet ID using the Violet Protocol

function hashVioletID(nickname, fileHash, slotNumber) {
    const context = "Document-Signing-App";  // Context for the Violet ID
    const identityContext = localStorage.getItem('userEmail') || 'user@example.com';  // Identity context
    const slotStr = slotNumber.toString().slice(-3);  // Last 3 digits of slot number

    const combined = `${context}${identityContext}${nickname}${fileHash}${slotStr}`;
    return CryptoJS.SHA256(combined).toString(CryptoJS.enc.Hex);  // Generate the Violet ID
}


// Function to download the receipt
function downloadReceipt() {
    const receipt = {
        nickname: nickname,
        fileHash: fileHash,
        email: localStorage.getItem('userEmail') || 'user@example.com',
        slotNumber: slotNumber,
        transactionId: transactionId  // Store the transaction ID for reference
    };

    const fileName = `violet-core-demo_${nickname}_${fileInput.name}.vgti`;
    const fileContent = JSON.stringify(receipt, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // After download completes, show the verification link
    document.getElementById('status').innerHTML += `
        <a href="https://verify.graf.land" class="proceed-link"><b>Step 3: </b>Proceed to Verify Document</a>
    `;
}

// Event listener for document signing
document.getElementById('sign-doc-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    nickname = document.getElementById('nickname').value;
    fileInput = document.getElementById('file').files[0];

    if (!fileInput || !nickname.trim()) {
        alert("Please provide both a nickname and a file.");
        return;
    }

    // Fetch the slot number
    slotNumber = await fetchSlotNumber();

    const fileReader = new FileReader();
    fileReader.onloadend = async function () {
        try {
            fileHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(fileReader.result)).toString(CryptoJS.enc.Hex);
            const violet_id = hashVioletID(nickname, fileHash, slotNumber);

            // Send the transaction to the backend
            const response = await fetch('https://api.graf.land/send-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                         nickname: nickname,
                         fileHash: fileHash,
                         email: localStorage.getItem('userEmail') || 'user@example.com'  // Email is required
                }),

            });

            const result = await response.json();
            if (result.status === "success") {
                transactionId = result.transaction_id;

                const receipt = {
                    nickname: nickname,
                    fileHash: fileHash,
                    email: localStorage.getItem('userEmail') || 'user@example.com',
                    transactionId: transactionId
                };

                // Display the pretty-printed JSON as a code block
                document.getElementById('status').innerHTML = `
                    <p>The data you will download in the next step:</p>
                    <pre><code>${JSON.stringify(receipt, null, 2)}</code></pre>
                    <button id="download-receipt"><b>Step 2: </b>Download Transaction Receipt</button>
                `;

                document.getElementById('download-receipt').addEventListener('click', downloadReceipt);
            } else {
                document.getElementById('status').innerText = `Transaction Failed: ${result.detail}`;
            }
        } catch (error) {
            console.error("Error:", error);
            document.getElementById('status').innerText = "An error occurred.";
        }
    };

    fileReader.readAsArrayBuffer(fileInput);
});
