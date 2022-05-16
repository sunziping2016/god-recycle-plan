module.exports = {
  publicPath: process.env.NODE_ENV === "production" ? "./" : "/game/",
  chainWebpack: (config) => {
    config.plugin("html").tap((args) => {
      args[0].title = "上帝回收计划";
      return args;
    });
  },
  devServer: {
    allowedHosts: ["arch.szp15.com"],
  },
};
