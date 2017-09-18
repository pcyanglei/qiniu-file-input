import gulp from 'gulp'; //引入gulp
import gulpLoadPlugins from 'gulp-load-plugins'; //自动加载插件 省去一个一个require进来
import browserSync from 'browser-sync'; //浏览器同步
// import {stream as wiredep} from 'wiredep'; //把bower 下载的文件引入到html文件中
import rev from 'gulp-rev-append';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;


gulp.task('clean' , function(){
    return gulp.src([
        'dist/*',
    ] ).pipe($.clean());
});

//sass处理
gulp.task('styles' , ()=>{
    return gulp.src('src/styles/*.scss') //指明源文件路径 读取其数据流
        .pipe($.plumber()) //替换错误的pipe方法  使数据流正常运行
        .pipe($.sourcemaps.init()) //压缩环境出现错误能找到未压缩的错误来源
        .pipe($.sass.sync({        //预编译sass
            outputStyle: 'expanded', //CSS编译后的方式
            precision: 10,//保留小数点后几位
            includePaths: ['.']
        }).on('error', $.sass.logError))
        .pipe($.autoprefixer({browsers:['> 1%', 'last 2 versions', 'Firefox ESR']}))     //自动匹配浏览器支持的后缀
        .pipe($.sourcemaps.write('.'))  //map文件命名
        .pipe(gulp.dest('dist/styles'))  //指定输出路径
});

//使用es6
gulp.task('scripts' , ()=>{
    return gulp.src('src/scripts/**/*.js')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.babel())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist/scripts'));
});

//压缩图片
gulp.task('images',()=>{
    return gulp.src('src/images/**/*')
        .pipe ($.cache ($.imagemin ({ //使用cache只压缩改变的图片
            optimizationLevel: 3,         //压缩级别
            progressive: true,
            interlaced: true})
        ))
        .pipe (gulp.dest ('dist/images'));
});
//压缩css文件
gulp.task('css-min',function(){
    gulp.src('dist/styles/*.css')
        .pipe($.cssmin())
        .pipe($.rename({suffix:'.min'}))
        .pipe(gulp.dest('dist/styles'));
});


//压缩js文件
gulp.task('js-min',function(){
    gulp.src('dist/scripts/*.js')
        .pipe($.uglify())
        .pipe($.rename({suffix:'.min'}))
        .pipe(gulp.dest('dist/scripts'));
});

gulp.task('html', ()=>{   //先执行styles scripts任务
    var options = {
        removeComments: false,//清除HTML注释
        // collapseWhitespace: true,//压缩HTML
        collapseBooleanAttributes: false,//省略布尔属性的值 <input checked="true"/> ==> <input />
        removeEmptyAttributes: false,//删除所有空格作属性值 <input id="" /> ==> <input />
        removeScriptTypeAttributes: false,//删除<script>的type="text/javascript"
        removeStyleLinkTypeAttributes: false,//删除<style>和<link>的type="text/css"
        minifyJS: false,//压缩页面里的JS
        minifyCSS: false//压缩页面里的CSS
    };
    return gulp.src('src/*.html')
        .pipe(wiredep({
            optional: 'configuration',
            goes: 'here'
        }))
        .pipe($.plumber())
        .pipe($.useref({searchPath: ['src', '.']}))  //将页面上 <!--endbuild--> 根据上下顺序合并
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.cssnano()))
        .pipe(rev())       //为引用添加版本号
        .pipe($.if('*.html', $.htmlmin(options)))
        .pipe(gulp.dest('dist'));
});


//引用字体文件
gulp.task('fonts', () => {
    return gulp.src(require('main-bower-files')('**/*.   {eot,svg,ttf,woff,woff2}', function (err) {})  //main-bower-files会从bower.json文件里寻找定义好的主要文件路径
        .concat('src/fonts/**/*'))  //将bootstrap-sass的fonts和app下我们自己选用的fonts合并起来
        .pipe(gulp.dest('dist/fonts'));
});

//本地服务器
gulp.task('serve', ['styles','scripts','fonts'] , ()=>{
    browserSync({
        notify : false,
        port:8080,
        server:{
            baseDir:['dist'],
            routes:{
                '/bower': 'bower'
            }
        }
    });

    gulp.watch([      //监测文件变化 实行重新加载
        'dist/*.html',
        'dist/styles/*.css',
        'dist/scripts/*.js',
    ]).on('change',reload);

    gulp.watch('src/**/*.html' , ['html']);
    gulp.watch('src/styles/**/*.scss' , ['styles']);
    gulp.watch('src/scripts/**/*.js' , ['scripts']);
    gulp.watch('src/fonts/**/*' , ['fonts']);
});

var wiredep = require('wiredep').stream;

gulp.task('bower', function () {
    gulp.src('./src/index.html')
        .pipe(wiredep({
            optional: 'configuration',
            goes: 'here'
        }))
        .pipe(gulp.dest('./dist'));
});
gulp.task('build' , ['html' , 'images' , 'fonts'],()=>{
    return gulp.src('dist/**/*')
        .pipe($.size({title:'build' , gzip:true}));
});

gulp.task('default' ,['clean'],()=>{
    gulp.start('build');
});