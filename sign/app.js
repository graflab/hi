document.getElementById('documentForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const nickname = document.getElementById('nickname').value;
    const email = "someone@test.email.com"; // Dummy email
    const file = document.getElementById('file').files[0];
    const statusDiv = document.getElementById('status');

    if (!file) {
        alert("Please select a file to hash in your browser.");
        return;
    }

    // Clear status and keep hidden initially
    statusDiv.innerHTML = ""; 
    statusDiv.style.display = 'none';  // Initially hide the status box

    try {
        // Step 1: Hash the selected file (SHA-256) to use as identity context
        statusDiv.innerHTML += "<div class='status-info'>Starting process...</div>";
        statusDiv.style.display = 'block';  // Show the status div when the first update happens

        statusDiv.innerHTML += "<div class='status-code'>Hashing the selected file to create the identity context...</div>";
        const fileHash = await hashFile(file);
        statusDiv.innerHTML += `<div class='status-code'>File hash (SHA-256): ${fileHash}</div>`;

        // Fetch the latest slot number (to use for generating the Violet ID)
        const slotResponse = await fetch('https://api.graf.land/latest-slot');
        const slotData = await slotResponse.json();
        const slotNumber = slotData.slot_number;

        statusDiv.innerHTML += `<div class='status-code'>Using slot number: ${slotNumber}</div>`;

        // Step 2: Prepare the data to send to the backend API
        statusDiv.innerHTML += "<div class='status-code'>Preparing data with nickname, email, and file hash for backend processing...</div>";
        const data = {
            nickname: nickname,
            fileHash: fileHash,
            email: email,  // Dummy email included in the data
            slot_number: slotNumber  // Include the slot number
        };

        // Step 3: Send request to backend to create Violet ID and store it on-chain
        statusDiv.innerHTML += "<div class='status-code'>Sending request to backend to generate Violet ID and perform the on-chain transaction...</div>";
        const response = await fetch('https://api.graf.land/send-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to create Violet ID');
        }

        const result = await response.json();
        const violetId = result.violet_id;
        const transactionId = result.transaction_id;

        // Step 4: Display verbose Violet ID creation process
        statusDiv.innerHTML += `<div class='status-success status-code'>Violet ID generated: ${violetId}</div>`;
        statusDiv.innerHTML += "The Violet ID is a combination of:<br>";
        statusDiv.innerHTML += `<div class='status-code'>- Context: "Document-Signing-App"</div>`;
        statusDiv.innerHTML += `<div class='status-code'>- Identity context (file hash): ${fileHash}</div>`;
        statusDiv.innerHTML += `<div class='status-code'>- Nickname: ${nickname}</div>`;
        statusDiv.innerHTML += `<div class='status-code'>- Email: ${email}</div>`;  // Displaying dummy email
        statusDiv.innerHTML += `<div class='status-code'>- Slot number: ${slotNumber}</div>`;
        statusDiv.innerHTML += `<div class='status-code'>- Secret: "somesecret2024"</div><br>`;

        // Step 5: Show on-chain transaction details
        statusDiv.innerHTML += `<div class='status-success status-code'>Transaction successful!<br>Transaction ID: ${transactionId}</div>`;
        statusDiv.innerHTML += "This transaction has stored the Violet ID on the Cardano blockchain.<br>";

        // Step 6: Create the .vgti file for download
        statusDiv.innerHTML += "Generating .vgti file for download...<br>";
        const vgtiData = {
            nickname: nickname,
            email: email,  // Dummy email used in the .vgti file
            identityContext: fileHash,
            violetId: violetId,
            slotNumber: slotNumber  // Include the slot number in the .vgti file
        };

        const blob = new Blob([JSON.stringify(vgtiData, null, 2)], { type: "application/json" });
        const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.'); // Get original file name without extension
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${nickname}-VIOLET_GRAF_DOCS_SIGNING_RECEIPT.vgti`;  // Proper naming of the .vgti file
        downloadLink.click();

        statusDiv.innerHTML += "<div class='status-success status-code'>Download ready: .vgti document.<br>Process completed successfully.</div>";

        // Step 7: Provide verification link
        statusDiv.innerHTML += `<div class='status-code'>Go verify your document here: <a href="https://docs.graf.land/verify" target="_blank" class="status-success">https://docs.graf.land/verify</a></div>`;

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
