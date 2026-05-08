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

    if (content.startsWith("import { motion } from 'framer-motion';\n")) {
        content = content.replace("import { motion } from 'framer-motion';\n", "");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Cleaned duplicate in ${file}`);
    }
});
