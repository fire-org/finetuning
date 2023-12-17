const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'orion.v0.3.1');

function checkConversations(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach(item => {
        if (item.conversations) {
            item.conversations.forEach(conversation => {
                if (conversation.from === 'character') {
                    const count = (conversation.value.match(/\|\|/g) || []).length;
                    if (count !== 1) {
                        console.log(`Invalid format in file ${filePath}:`, conversation);
                    }
                    if(!conversation.value.includes('|| none') && !conversation.value.includes('|| image')) {
                        console.log(`Invalid format type in file ${filePath}:`, conversation);
                    }
                }
            });
        }
    });
}

function readFilesRecursively(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            readFilesRecursively(fullPath);
        } else if (path.extname(fullPath) === '.json') {
            checkConversations(fullPath);
        }
    });
}

readFilesRecursively(directoryPath);
