"use strict";

let win = nw.Window.get();
let fs = require('fs');
let path = require('path');
let rimraf = require('rimraf');
let gm = require('gm').subClass({imageMagick: true});

let Store = {
    fetchPages: function () {
        return $.getJSON('http://url/cmd.php?command=getCategories');
    },

    fetchPage: function (id) {
        return $.getJSON('http://url/cmd.php?command=getItem&id=' + id);
    },

    save: function (data) {
        return $.post('http://url/cmd.php?command=saveItem', data);
    },

    upload: function (data) {
        return $.ajax({
            type: 'POST',
            url: 'http://url/cmd.php?command=fileUpload',
            data: data,
            processData: false,
            contentType: false
        });
    },
};

let Utils = {
    trim: function (str, chars) {
        return this.ltrim(this.rtrim(str, chars), chars);
    },

    ltrim: function (str, chars) {
        chars = chars || "\\s";
        return str.replace(new RegExp("^[" + chars + "]+", "g"), "");
    },

    rtrim: function (str, chars) {
        chars = chars || "\\s";
        return str.replace(new RegExp("[" + chars + "]+$", "g"), "");
    },

    sanitizeFile: function (name) {
        let ext = path.extname(name).toLowerCase();
        name = name.slice(0, name.length - ext.length);

        return this.sanitize(name) + ext;
    },

    sanitize: function (value) {
        value = value
            .toLowerCase()
            .replace(/[^a-zа-яёЁ0-9-_\s]/ig, '')
            .replace(/[\s-]/ig, '_')
            .replace(/_+/ig, '_');

        return this.trim(value, '_');
    },

    translite: function (str) {
        let arr = {
            'а': 'a',
            'б': 'b',
            'в': 'v',
            'г': 'g',
            'д': 'd',
            'е': 'e',
            'ё': 'yo',
            'ж': 'g',
            'з': 'z',
            'и': 'i',
            'й': 'y',
            'к': 'k',
            'л': 'l',
            'м': 'm',
            'н': 'n',
            'о': 'o',
            'п': 'p',
            'р': 'r',
            'с': 's',
            'т': 't',
            'у': 'u',
            'ф': 'f',
            'х': 'ch',
            'ц': 'c',
            'ч': 'ch',
            'ш': 'sh',
            'щ': 'shh',
            'ъ': '',
            'ь': '',
            'ы': 'y',
            'э': 'e',
            'ю': 'yu',
            'я': 'ya',
            'А': 'A',
            'Б': 'B',
            'В': 'V',
            'Г': 'G',
            'Д': 'D',
            'Е': 'E',
            'Ё': 'YO',
            'Ж': 'G',
            'З': 'Z',
            'И': 'I',
            'Й': 'Y',
            'К': 'K',
            'Л': 'L',
            'М': 'M',
            'Н': 'N',
            'О': 'O',
            'П': 'P',
            'Р': 'R',
            'С': 'S',
            'Т': 'T',
            'У': 'U',
            'Ф': 'F',
            'Х': 'CH',
            'Ц': 'C',
            'Ч': 'CH',
            'Ш': 'SH',
            'Щ': 'SHH',
            'Ъ': '',
            'Ь': '',
            'Ы': 'y',
            'Ю': 'YU',
            'Я': 'YA',
            'Э': 'E',
            '#': '',
            ' ': '-'
        };

        return str.replace(/./g, (a) => arr[a] !== void 0 ? arr[a] : a);
    },

    findImages: function (folder) {
        if (!folder.length) {
            return [];
        }

        let files = fs.readdirSync(folder)
            .filter(file => {
                let ext = path.extname(file).toLowerCase();
                return (file.indexOf('.') !== 0) && ['.jpg', '.jpeg', '.bmp', '.gif', '.png'].indexOf(ext) > -1;
            })
            .map(name => {
                let filePath = path.join(folder, name);
                let stats = fs.statSync(filePath);

                let file = {
                    name: name,
                    path: filePath,
                    url: path.join('file://', filePath),
                    href: '',
                    ext: path.extname(name).toLowerCase(),
                    size: (stats.size / 1024).toFixed(2) + ' kB',
                    width: 0,
                    height: 0,
                    upload: false,
                    uploaded: false,
                    converted: false
                };

                gm(file.path).size(function (err, size) {
                    file = Object.assign(file, size);
                });

                return file;
            });

        return files;
    },

    convert: function (files, srcPath, size) {
        let _this = this;
        let tmpPath = path.join(srcPath, 'tmp');

        rimraf.sync(tmpPath, {glob: true}, console.log.bind(console));
        fs.mkdirSync(tmpPath, console.log.bind(console));

        files.map(function (file) {
            let newName = _this.translite(_this.sanitizeFile(file.name));
            let newPath = path.join(tmpPath, newName);

            let w = file.width > file.height ? null : size;
            let h = file.width > file.height ? size : null;

            gm(file.path)
                .resize(w, h)
                .noProfile()
                .write(newPath, function () {
                    let stats = fs.statSync(newPath);

                    file.converted = true;
                    file.size = (stats.size / 1024).toFixed(2) + ' kB';
                    file.name = newName;
                    file.path = newPath;

                    gm(newPath).size(function (err, size) {
                        file = Object.assign(file, size);
                    });
                });
        });
    },

    upload: function (files, destName) {
        files.map(function (file) {
            file.upload = true;
            file.href = `http://flat-dream.ru/files/Alexandr/${destName}/${file.name}`;

            let data = new FormData();
            data.append('folder', destName);
            data.append('replace', 1);
            data.append('newName', file.name);
            data.append('file', new Blob([fs.readFileSync(file.path)]), file.name);

            Store
                .upload(data)
                .then(function (json) {
                    file.upload = false;
                    file.uploaded = json.success;
                });
        });
    }
};

let App = new Vue({
    el: '#app',
    data: function () {
        return {
            minSize: 768,
            pages: [],
            currentPageId: 0,
            currentPage: {},
            sourceDir: '',
            destDir: '',
            images: [],
        }
    },
    mounted: function () {
        let _this = this;

        $(this.$refs.select).select2()
            .on('change', function () {
                _this.currentPageId = this.value;
                _this.fetchPage();
            });

        $('[data-toggle="tooltip"]').tooltip({placement: 'bottom'});

        window.addEventListener('resize', this.onResizeWindow.bind(this));

        this.fetchPages();
        this.onResizeWindow();
    },
    computed: {
        validateUpload: function () {
            return this.destDir.length/* && this.images.every(function (file) {
                    return file.converted;
                })*/
        },
        uploadResult: function () {
            let _this = this;
            let lines = this.images
                .filter(function (file) {
                    return file.uploaded;
                })
                .map(function (file, index) {
                    return [
                        '<a href="http://flat-dream.ru/files/Alexandr/',
                        _this.destDir,
                        "/",
                        file.name,
                        '" target="_blank">Фото',
                        (index + 1),
                        '</a>&nbsp;&nbsp;'
                    ].join('');
                });

            return lines.join('');
        }
    },
    methods: {
        fetchPages: function () {
            let _this = this;

            Store
                .fetchPages()
                .then(function (d) {
                    _this.pages = d;
                });
        },
        fetchPage: function () {
            if (this.currentPageId == 0) return;

            let _this = this;

            Store
                .fetchPage(this.currentPageId)
                .then(function (d) {
                    _this.currentPage = d;
                });
        },
        onSave: function () {
            Store
                .save(this.currentPage)
                .then(function (json) {
                    alert(json == 0 || json == 1 ? "Сохранено" : json);
                });
        },
        onResetPage: function () {
            this.currentPageId = 0;
            this.currentPage = {};
        },
        onResizeWindow: function () {
            var h = win.height - 32 - $(this.$refs.editor).offset().top;
            $(this.$refs.editor).height(h + 'px');
        },
        onSelectSource: function () {
            this.$refs.sourceDir.click();
        },
        onChangeSource: function () {
            this.sourceDir = this.$refs.sourceDir.value;

            this.findImages();
        },
        onReloadImages: function () {
            this.findImages();
        },
        onChangeDestDir: function () {
            let _this = this;

            setTimeout(function () {
                _this.destDir = Utils.translite(Utils.sanitize(_this.destDir));
            }, 2000);
        },
        findImages: function () {
            this.images = Utils.findImages(this.sourceDir);
        },
        onConvert: function () {
            Utils.convert(this.images, this.sourceDir, this.minSize);
        },
        onUpload: function () {
            Utils.upload(this.images, this.destDir);

            let clipboard = nw.Clipboard.get();
            clipboard.set(this.uploadResult, 'text');
        }
    }
});

// win.showDevTools();