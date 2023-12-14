const fs = require('fs');
const path = require('path');

// Function to read the JSON file and categorize objects by type
function categorizeByType() {
  const filePath = path.join(__dirname, 'orion.v0.1.json');
  const outputDir = path.join(__dirname, 'orion.v0.1');

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    try {
      const objects = JSON.parse(data);
      const categorized = {};

      // Group objects by type
      objects.forEach(obj => {
        if (obj.type) {
          if (!categorized[obj.type]) {
            categorized[obj.type] = [];
          }
          categorized[obj.type].push(obj);
        }
      });

      // Write each category to a separate file in the specified directory
      Object.keys(categorized).forEach(type => {
        const outputFile = path.join(outputDir, `${type}.json`);
        fs.writeFile(outputFile, JSON.stringify(categorized[type], null, 2), err => {
          if (err) {
            console.error(`Error writing the file for type ${type}:`, err);
          } else {
            console.log(`File written for type ${type} at ${outputFile}`);
          }
        });
      });

    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
    }
  });
}

// Call the function
categorizeByType();
