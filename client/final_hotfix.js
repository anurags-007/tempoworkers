import fs from 'fs';

const walkSync = function(dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            filelist = walkSync(dir + '/' + file, filelist);
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                filelist.push(dir + '/' + file);
            }
        }
    });
    return filelist;
};

const files = walkSync('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('<motion')) {
        if (!content.includes('import { motion') && !content.includes('import {motion')) {
            content = "import { motion } from 'framer-motion';\n" + content;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Successfully added motion to ${file}`);
    }
});
