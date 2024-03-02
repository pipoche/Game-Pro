window.TRANS = (function() {
    const _cache = {};
    let _options = {
        Lang: null,
        BrandName: null,
        ProductName: "games",
        GroupNames: ["common", "custom"],
        StaticApiEndpoint: __STATIC_API__,
    };

    function setTranslations(group, texts) {
        if (texts && texts.length > 0) {
            texts.forEach((txt) => {
                const key = `${group}__${txt.key}`;
                _cache[key] = txt.value;

                $(`[data-trans='${key}']`).each(function(index) {
                    var $this = $(this);

                    var attr = $this.attr("data-trans-attr");
                    if (attr) {
                        $this.attr(attr, txt.value);
                    } else {
                        $this.html(txt.value);
                    }
                });
            });
        }
    }

    function loadGroup(groupName) {
        const url =
            _options.StaticApiEndpoint +
            `translations/get?GroupName=${groupName}` +
            `&DefaultLangCode=EN` +
            `&LangCode=${_options.Lang}` +
            `&ProductName=${_options.ProductName}` +
            `&BrandName=${_options.BrandName}`;

        $.getJSON(url, function(res) {
            if (!res.error && res.data) {
                setTranslations(groupName, res.data);
            }
        }).fail(function() {
            console.log("error on load " + url);
        });
    }

    function loadGroups() {
        _options.GroupNames.forEach((group) => {
            loadGroup(group);
        });
    }

    const init = () => {
        _options.Lang = UGG.lang();
        _options.BrandName = UGG.companyName();
        _options.GroupNames.push(UGG.gameName());

        loadGroups();
    };

    const byKey = (key, devText) => {
        if (key in _cache) return _cache[key];

        console.warn(`key '${key}' not found in TRANS.byKey`);

        return devText || key;
    };

    const byGameKey = (key, devText) => {
        key = UGG.gameName() + "__" + key;
        if (key in _cache) return _cache[key];

        console.warn(`key '${key}' not found in TRANS.byGameKey`);

        return devText || key;
    };

    const byAnyKey = (key, devText) => {
        let fullkey = UGG.gameName() + "__" + key;
        if (fullkey in _cache) return _cache[fullkey];

        fullkey = "common__" + key;
        if (fullkey in _cache) return _cache[fullkey];

        console.warn(`key '${fullkey}' not found in TRANS.byAnyKey`);

        return devText || key;
    };

    return {
        init: init,
        byKey: byKey,
        byGameKey: byGameKey,
        byAnyKey: byAnyKey,
    };
})();

export default TRANS;