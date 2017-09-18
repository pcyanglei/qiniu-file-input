class QiniuFileInput{

    constructor(config)
    {
        let defaultConfig = {
            max : 3,
            accept: "image/jpeg,image/gif,image/png",
            size:204800
        };
        this.config = Object.assign(defaultConfig,config);
        this.init();
    }
    static randomChar(len = 5)
    {
        let  x= "0123456789qwertyuioplkjhgfdsazxcvbnm";
        let  tmp="";
        for(let i=0; i< len; i++) {
            tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
        }
        return tmp;
    }
    static requestQiniu(obj)
    {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", obj.url, true);
        xhr.upload.addEventListener("progress",  (evt)=>{
            let p = Math.floor(evt.loaded / evt.total * 100);
            typeof obj.progress === "function" && obj.progress(p);
        });
        xhr.onreadystatechange = (response)=>{
            if (xhr.readyState === 4) {
                if (xhr.status === 200 && xhr.responseText !== '') {
                    let r = JSON.parse(xhr.responseText);
                    typeof obj.success === "function" && obj.success(r);
                }
                if (xhr.status !== 200) {
                    typeof obj.error === "function" && obj.error({
                        message: JSON.parse(xhr.responseText).error,
                        status: xhr.status
                    });
                }
            }

        };
        xhr.send(obj.data);
    }
    static getFileKey(item,len=10)
    {
        let oDate = new Date();
        return `${oDate.getFullYear()}/${oDate.getMonth()+1}/${QiniuFileInput.randomChar(len)}.${item.name.split('.').splice(-1)}`;
    }
    init()
    {
        new Vue({
            el : this.config.el,
            data : {
                progress:0,
                errMessage : '',
                config : this.config,
                imageList:[]
            },
            mounted(){
                if (this.config.imageList != null) {
                    for (let item of this.config.imageList) {
                        this.imageList.push({
                            name:item
                        });
                    }
                }
            },
            methods:{
                setErrMessage(str=''){
                    this.errMessage = str;
                },
                upload(event)
                {
                    let totalLength = event.target.files.length + this.imageList.length;
                    if (totalLength > this.config.max){
                        this.setErrMessage(`图片超出最大允许上传个数:${this.config.max},请删除一些图片!`);
                        return;
                    }
                    let bigImages = '';
                    for (let item of event.target.files) {
                        if (item.size > this.config.size){
                            bigImages += `${item.name}  `;
                            continue;
                        }
                        let data = new FormData();
                        data.append("file", item);
                        data.append("token", this.config.token);
                        data.append("key",QiniuFileInput.getFileKey(item));
                        QiniuFileInput.requestQiniu({
                            url:this.config.url,
                            data : data,
                            error:(r)=>{
                                this.setErrMessage(r.message);
                            },
                            success:(res)=>{
                                typeof this.config.onsuccess === "function" && this.config.onsuccess(res);
                                this.imageList.push({
                                    name:`${this.config.cdnUrl}/${res.key}`
                                });
                            },
                            progress:(p)=>{
                                if ( p === 100 ) {
                                    setTimeout(()=>{
                                        this.progress = 0;
                                    },1000)
                                }
                                this.progress = p;
                            }
                        });
                    }
                    if (bigImages !== ''){
                        this.setErrMessage(`${bigImages}超出最大限制${parseInt(this.config.size/1024)}KB,已忽略上传`)
                    }
                },
                deleteImg(index){
                    typeof this.config.ondelete === "function" && this.config.ondelete(this.imageList[index]);
                    this.imageList.splice(index,1);
                }
            }
        });
    }
}