const fs = require('fs');
const path = require('path');

// Helper function to recursively process each file in directories
function processDirectory(directoryPath) {
  fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error('Error reading the directory:', err);
      return;
    }

    entries.forEach(entry => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        // Recursively process the nested directory
        processDirectory(entryPath);
      } else {
        // Process the file
        countObjectsInFile(entryPath, entry.name);
      }
    });
  });
}

// Function to count the number of objects in each category file
function countObjectsInFile(filePath, fileName) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading the file ${fileName}:`, err);
      return;
    }

    try {
      const objects = JSON.parse(data);
      console.log(`Number of objects in ${fileName}: ${objects.length}`);
    } catch (parseErr) {
      console.error(`Error parsing JSON in file ${fileName}:`, parseErr);
    }
  });
}

// Function to start the process
function countObjectsInCategories() {
  const directoryPath = path.join(__dirname, 'orion.v0.3.3');
  processDirectory(directoryPath);
}

// Call the function
countObjectsInCategories();
