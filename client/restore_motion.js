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
        // if it lacks motion import
        if (!content.includes('motion } from') && !content.includes('motion} from')) {
            if (content.includes("import { AnimatePresence } from 'framer-motion';")) {
                content = content.replace("import { AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';");
                changed = true;
            } else if (content.includes('import { AnimatePresence } from "framer-motion";')) {
                content = content.replace('import { AnimatePresence } from "framer-motion";', 'import { motion, AnimatePresence } from "framer-motion";');
                changed = true;
            } else {
                // inject it after React import
                content = content.replace(/(import React.*?;\n)/, "$1import { motion } from 'framer-motion';\n");
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Restored motion to ${file}`);
    }
});
