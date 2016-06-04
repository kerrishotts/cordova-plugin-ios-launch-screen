module.exports = function(ctx) {
    if (ctx.opts.platforms.indexOf("ios") < 0) {
        return;
    }

    //console.log(JSON.stringify(ctx,null,2));

    var shell = ctx.requireCordovaModule("shelljs");
    var path = ctx.requireCordovaModule("path");
    var events = ctx.requireCordovaModule("cordova-common").events;
    var configPath = ctx.requireCordovaModule("../cordova/util").projectConfig(ctx.opts.projectRoot);
    var ConfigParser = ctx.requireCordovaModule("cordova-common").ConfigParser;
    var cfg = new ConfigParser(configPath);
    var projectName = cfg.name();
    var splashScreens = cfg.getSplashScreens("ios");
    var universalSplash;
    var absSplashTarget;
    var absSplashSource;
    var absStoryboardPath;

    var splashTemplateString = '        <image name="Default@3x~universal.png" width="%W%" height="%H%"/>';
    var splashRegex = /^        <image name="Default@3x~universal.png" width="[0-9]*" height="[0-9]*"\/>/gm;

    if (splashScreens) {
        universalSplash = splashScreens.reduce(function (prev, cur) {
            return (cur.src.indexOf("universal") >= 0 ? cur : prev);
        }, "");

        if (universalSplash && universalSplash.src) {
            absSplashSource = path.join(ctx.opts.projectRoot, universalSplash.src);
            absSplashTarget = path.join(ctx.opts.projectRoot, "platforms", "ios", projectName, "Resources", "Default@3x~universal.png");
            absStoryboardPath = path.join(ctx.opts.projectRoot, "platforms", "ios", projectName, "Resources", "Launch Screen.storyboard");
            events.emit("verbose", "Copying found splash to iOS project resources for launch storyboard. " +
                        "src:" + absSplashSource +
                        " to:" + absSplashTarget
                       );
            shell.cp("-f", absSplashSource, absSplashTarget);
            events.emit("verbose", "Finished copying splash");

            // Need to replace the following line in the storyboard
            //         <image name="Default@3x~universal.png" width="..." height="..."/>
            // with the correct width and height

            events.emit("verbose", "Fixing up " + absStoryboardPath + " with correct width: " +
                        universalSplash.width + " and height: " +
                        universalSplash.height);
            shell.sed("-i", splashRegex,
                      splashTemplateString.replace("%W%", universalSplash.width)
                                          .replace("%H%", universalSplash.height),
                      absStoryboardPath);
            events.emit("verbose", "Fixup of storyboard complete.");

        } else {
            events.emit("warn", "No universal splash screen found; launch storyboard will be default!")
        }
    } else {
        events.emit("warn", "No splash screens found; launch storyboard will be default!")
    }
}
