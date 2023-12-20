const fs = require('fs');
const path = require('path');

// Define the path to the file
const filePath = path.join(__dirname, 'orion.v0.3.2', 'orion-nsfw.json');

// Function to filter the JSON data
function filterData(data) {
    return data.filter(item => !item.tag.startsWith('orion-nsfw-test'));
}

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // Parse the JSON data
    let jsonData;
    try {
        jsonData = JSON.parse(data);
    } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        return;
    }

    // Filter the data
    const filteredData = filterData(jsonData);

    // Convert back to JSON
    const newJsonData = JSON.stringify(filteredData, null, 2);

    // Write the data back to the file
    fs.writeFile(filePath, newJsonData, 'utf8', writeErr => {
        if (writeErr) {
            console.error("Error writing back to the file:", writeErr);
        } else {
            console.log("File updated successfully.");
        }
    });
});
