const  express=require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const app=express();
const formidable=require('formidable');
const session= require('express-session');
const server = require('http').createServer(app);

var fs=require('fs');
app.use(session({
      key:"admin",
      secret:"some random secret key",
      saveUninitialized:false,
      resave:false
}));
mongoose.connect('mongodb://localhost/blog', {useNewUrlParser: true});
var commentSchema=new mongoose.Schema(
            {
              username:{
                type:String,
                required:true
              },
              comment:{
                type:String,
                required:true
              }
            }
);
var Admin=mongoose.model('Admin',{
  email:String,
  password:String
});

var Comment=mongoose.model('Comment',commentSchema);
var blogSchema=new mongoose.Schema(
        {
          title:{
            type:String,
            required:true
          },
          content:{
            type:String,
            required:true
          },
          image:String,
          comments:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
        }
);
var Blog = mongoose.model('Blog', blogSchema);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.get('/',function(req,res){
      Blog.find({},function(err,results){
           res.render("user/home",{posts:results});
      });
});
app.get('/admin',function(req,res){
  console.log("yo");
  res.render('admin/login');
});
app.get('/admin/dashboard',function(req,res){
  if(req.session.admin){
  res.render("admin/dashboard");
} else {
  res.redirect("/admin");
}
});
app.get('/admin/posts',function(req,res){
  if(req.session.admin){
  res.render("admin/posts");
} else {
  res.redirect("/admin");
}
});
app.post('/do-login',function(req,res){
        console.log(req.body);
         Admin.findOne(req.body,function(err,admin){
           console.log(admin);
           if(admin){
             req.session.admin=admin;
           }
           res.send(admin);
         });
});
app.get('/do-logout',function(req,res){
    req.session.destroy();
    res.redirect("/admin");
});
app.post('/do-upload-image',function(req,res){
         console.log("yo ");
         var form=new formidable.IncomingForm();
         form.parse(req,function(err,fields,files){
           var oldpath=files.filetoupload.path;
           var newpath='public/images/'+files.filetoupload.name;
           fs.rename(oldpath,newpath,function(err){

                res.send(/images/+files.filetoupload.name);
           });
         });
})
app.post('/do-comment',function(req,res){
       Comment.create({username:req.body.username,comment:req.body.comment},function(err,comment){

                Blog.findById(mongoose.Types.ObjectId(req.body.post_id),function(err,blog){
                  console.log(blog);
                  blog.comments.push(comment.id);
                  blog.save(function(err,blog){
                          res.send({text:"posted successfully",id:comment.id});
                  });

                });
       });

});
app.get("/post/:id",function(req,res){

  Blog.findById(mongoose.Types.ObjectId(req.params.id)).populate('comments').exec(function(err,result){
       res.render('user/post',{post:result});
  });
});
app.post("/do-post",function(req,res){
  console.log(req.body);
    Blog.create(req.body,function(err,blog){
      console.log(blog);
      console.log("in post"+blog.id);
         res.send({text:"posted successfully",id:blog.id});
    });
});

const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on("new_post",function(post){
    socket.broadcast.emit("new_post",post);
  });
  socket.on("new_comment",function(comment){
       io.emit("new_comment",comment);
  });
 });


server.listen(3000);
