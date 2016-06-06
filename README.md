# cordova-plugin-ios-launch-screen

This plugin provides launch screen storyboard support for iOS targets. Launch screen storyboards are required in order to fully
support the new iPad Pro as there is no mechanism for providing a device-specific launch image. This means that Cordova apps no
longer need to be "scaled" on the iPad Pro!

**NOTE**: Please consider this plugin a _proof of concept_! It has **not** been fully tested, and it's entirely possible there are
all sorts of edge cases where this fails. It works on my machines, but that doesn't necessarily mean anything. If you do encounter
issues, please consider filing a bug report (along with any verbose logs).

Also note that this plugin does not enable support for the new multitasking features provided by iOS 9. Though trivial to add,
I don't want to make this plugin responsible for two features.

## Installation

Using the Cordova / PhoneGap CLI:

```
$ cordova plugin add https://github.com/kerrishotts/cordova-plugin-ios-launch-screen --save
```

Adding to `config.xml`:

```xml
<plugin name="cordova-plugin-ios-launch-screen" spec="https://github.com/kerrishotts/cordova-plugin-ios-launch-screen" />
```

## Use

The plugin is designed to work without much effort on your part. All you need to do is provide a new splash screen for the launch
storyboard, and the plugin will take it from there.

The new splash screen _must_ be named `Default@3x~universal.png` and included in your `config.xml` file like so (replacing [width]
and [height] appropriately, and using the appropriate path):

```xml
<platform name="ios">
    <splash src="res/screen/ios/Default@3x~universal.png" width="[width]" height="[height]" />
</platform>
```

When rendered, the launch screen is scaled to fit the screen using "aspect fill".

If no such image is detected, or the file doesn't exist where indicated, you'll receive the default launch image, which looks like
this:

![Universal Launch Image](res/Default%403x%7Euniversal.png?raw=true "Universal Launch Image")

> Image from <http://cordova.apache.org/artwork/>

## Designing your launch screen

Apple suggests that your launch image should represent your app's unpopulated interface. Unfortunately, due to the way this plugin
works, it is probably going to be difficult to fully accomplish that goal for anything beyond a simple background color.

Because the image is scaled using "aspect fill", you should render your launch image on a square canvas of sufficient size to cover
the screen of the 12.9-inch iPad Pro. This means your image should be at least 2732x2732, but it can be larger if you wish. If it is
smaller, it will simply be scaled up (with a corresponding loss of clarity).

One image must work for _all_ device form factors, orientations, and viewport sizes. This means that you can only reliably target
the center of the canvas so that you are sure the content isn't cropped in an undesirable manner. As such, my images have followed
this pattern:

* simple color wash for the background that matches the background color of the app, or

* a two-color wash for the background that matches the background color of the app and the background color of the navigation bar --
  the two colors fill the screen equally (navigation bar for top half, background color for bottom half)

* a simple logo or the app's name and tag line in the center of the app, sized such that it won't be cut off even on a small iPhone
  4s

    > Note: _Aspect ratio_ is important here, not physical pixels. An iPhone 4s uses a 3:2 aspect ratio, which means an
    > effective resolution of 1822 x 2732 (if using 2732 x 2732) in portrait.

* Size is not enforced, so you can use whatever canvas size makes sense for you. I tend to use 3072 (3 times 1024), but you might
  want to use something else. You can use a smaller size too, which makes sense for a color wash, but will blur any text or
  graphics.

## Aspect ratios and crops

The following table should give you an idea of the areas that will be exposed on various devices. The crops are taken from the
center of the image, so for an iPhone 4s using a 2732x2732 source image, the visible area will be roughly (455, 0) - (2277, 2732).

|     device     | aspect ratio |  portrait   |  landscape  | 
|:--------------:|:------------:|:-----------:|:-----------:|
|   iPhone 4s    |      3:2     | 1822 x 2732 | 2732 x 1822 |
|   iPhone 5     |     16:9     | 1537 x 2732 | 2732 x 1537 |
|   iPhone 5s    |     16:9     | 1537 x 2732 | 2732 x 1537 |
|   iPhone 6/6+  |     16:9     | 1537 x 2732 | 2732 x 1537 |
|   iPhone 6s/6s+|     16:9     | 1537 x 2732 | 2732 x 1537 |
|      iPad      |      4:3     | 2048 x 2732 | 2732 x 2048 |
|   iPad Minis   |      4:3     | 2048 x 2732 | 2732 x 2048 |
| 12.9" iPad Pro |      4:3     | 2048 x 2732 | 2732 x 2048 |

## Caveats

The plugin will copy over any changes made to the launch image at each prepare and clean operation. Unfortunately, this does not
guarantee that you'll see the launch image when you next launch the app. Apparently, iOS caches the launch screen, and I'm not sure
of a good way to clear this programmatically (if that is even possible). Even Xcode has this problem at times.

The simplest way to ensure that you see the desired splash screen in the simulator is to clear the simulator contents. This isn't
apt to be practical on your physical devices, unfortunately. A reboot of your device or a delete/reinstall of your app should do the
trick.

## Examples

This section links to some examples for your inspiration.

### Logology

The Logology splash is 3072x3072, and consists of a two-color background along with text for the app name and tag line. The top half
matches the color of the navigation bar (and status bar on iOS), and the bottom half matches the background color of the app.

![Logology Splash
Screen](https://github.com/kerrishotts/Mastering-PhoneGap-Code-Package/blob/master/design/iOS%20Launch%20Screen%20variation%202-3072.png?raw=true
"Logology Splash Screen")

### Other examples

If you create other examples, please feel free to submit with a PR.

## License

Apache 2.0 license. See LICENSE for full text.


