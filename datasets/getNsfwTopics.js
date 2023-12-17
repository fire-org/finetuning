const fs = require('fs');
const path = require('path');

// Construct the file path in the same directory as the script
const filePath = path.join(__dirname, 'orion.v0.1.full.json');

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    try {
        // Parse the JSON data
        const jsonData = JSON.parse(data);

        // Create a set to store unique topics
        const uniqueTopics = new Set();

        // Iterate through the objects and add topics to the set
        jsonData.forEach(item => {
            if (item.topic) {
                uniqueTopics.add(item.topic);
            }
        });

        // Convert the set to an array and output the unique topics
        const uniqueTopicsArray = Array.from(uniqueTopics);
        console.log('Unique Topics:', uniqueTopicsArray);
    } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
    }
});
