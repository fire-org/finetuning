const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, 'orion.v0.1.1'); // Folder path relative to script location

fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error('Error reading the directory:', err);
    return;
  }

  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', filePath, err);
        return;
      }

      try {
        const json = JSON.parse(data);
        let min = Infinity, max = -Infinity, sum = 0;

        json.forEach(item => {
          const length = item.conversations ? item.conversations.length : 0;
          min = Math.min(min, length);
          max = Math.max(max, length);
          sum += length;
        });

        const avg = json.length > 0 ? sum / json.length : 0;

        console.log(`${file} ${min} ${avg.toFixed(2)} ${max}`);
      } catch (e) {
        console.error('Error parsing JSON in file:', filePath, e);
      }
    });
  });
});
