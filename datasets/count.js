const fs = require('fs');
const path = require('path');

// Function to count the number of objects in each category file
function countObjectsInCategories() {
  const directoryPath = path.join(__dirname, 'orion.v0.1.1');

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading the directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(directoryPath, file);

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading the file ${file}:`, err);
          return;
        }

        try {
          const objects = JSON.parse(data);
          console.log(`Number of objects in ${file}: ${objects.length}`);
        } catch (parseErr) {
          console.error(`Error parsing JSON in file ${file}:`, parseErr);
        }
      });
    });
  });
}

// Call the function
countObjectsInCategories();
