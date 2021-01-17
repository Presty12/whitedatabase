const { Discord, Client, MessageEmbed } = require('discord.js');
const client = global.client = new Client({fetchAllMembers: true});
const ayarlar = require('./ayarlar.json');
const fs = require('fs');
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://1001:gamerbabo123@cluster0.3ye9b.mongodb.net/whitedatabase?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});// Mongo connect bağlantısı.
const Database = require("./models/role.js");


client.on("ready", async () => {
  client.user.setPresence({ activity: { name: "shina 💚 White" }, status: "online" });
  setRoleBackup();
  setInterval(() => {
    setRoleBackup();
  }, 1000*60*60*1);
});

client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(ayarlar.botPrefix)) return;
  if (message.author.id !== ayarlar.botOwner && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(ayarlar.botPrefix.length);
  let embed = new MessageEmbed().setColor("RANDOM").setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp();
  
  if (command === "eval" && message.author.id === ayarlar.botOwner) {
    if (!args[0]) return message.channel.send(`Kod belirtilmedi`);
      let code = args.join(' ');
      function clean(text) {
      if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
      text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
      return text;
    };
    try { 
      var evaled = clean(await eval(code));
      if(evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Yasaklı komut");
      message.channel.send(`${evaled.replace(client.token, "Yasaklı komut")}`, {code: "js", split: true});
    } catch(err) { message.channel.send(err, {code: "js", split: true}) };
  };



  if (command === "güvenli") {
    let hedef;
    let rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name === args.join(" "));
    let uye = message.mentions.users.first() || message.guild.members.cache.get(args[0]);
    if (rol) hedef = rol;
    if (uye) hedef = uye;
    let guvenliler = ayarlar.whitelist || [];
    if (!hedef) return message.channel.send(embed.setDescription(`Güvenli listeye eklemek/kaldırmak için bir hedef (rol/üye) belirtmelisin!`).addField("Güvenli Liste", guvenliler.length > 0 ? guvenliler.map(g => (message.guild.roles.cache.has(g.slice(1)) || message.guild.members.cache.has(g.slice(1))) ? (message.guild.roles.cache.get(g.slice(1)) || message.guild.members.cache.get(g.slice(1))) : g).join('\n')+"." : "Bulunamadı!"));
    if (guvenliler.some(g => g.includes(hedef.id))) {
      guvenliler = guvenliler.filter(g => !g.includes(hedef.id));
      ayarlar.whitelist = guvenliler;
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeden kaldırıldı!`));
    } else {
      ayarlar.whitelist.push(`y${hedef.id}`);
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeye eklendi!`));
    };
  };
  

  if (command === "ayar")  {
    if (!args[0] || args[0] !== "rol") return message.channel.send(embed.setDescription(`Rol korumasını aktif etmek veya devre dışı bırakmak için **${ayarlar.botPrefix}ayar rol** yazmanız yeterlidir! Rol koruması şu anda **${ayarlar.roleGuard ? "aktif" : "devre dışı"}!**`));
    ayarlar.roleGuard = !ayarlar.roleGuard;
    fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
      if (err) console.log(err);
    });
    message.channel.send(embed.setDescription(`**${args[0]}** koruması, ${message.author} tarafından ${ayarlar.roleGuard ? "aktif edildi" : "devre dışı bırakıldı"}!`));
  };

  if(command === "kur" || command === "kurulum" || command === "backup" || command === "setup") {
    if (!args[0] || isNaN(args[0])) return message.channel.send(embed.setDescription("Geçerli bir rol ID'si belirtmelisin!"));

    Database.findOne({guildID: ayarlar.guildID, roleID: args[0]}, async (err, roleData) => {
      if (!roleData) return message.channel.send(embed.setDescription("Belirtilen rol ID'sine ait veri bulunamadı!"));
      message.react("✅");
      let yeniRol = await message.guild.roles.create({
        data: {
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          permissions: roleData.permissions,
          position: roleData.position,
          mentionable: roleData.mentionable
        },
        reason: "Rol Silindiği İçin Tekrar Oluşturuldu!"
      });

      setTimeout(() => {
        let kanalPermVeri = roleData.channelOverwrites;
        if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
          let kanal = message.guild.channels.cache.get(perm.id);
          if (!kanal) return;
          setTimeout(() => {
            let yeniKanalPermVeri = {};
            perm.allow.forEach(p => {
              yeniKanalPermVeri[p] = true;
            });
            perm.deny.forEach(p => {
              yeniKanalPermVeri[p] = false;
            });
            kanal.createOverwrite(yeniRol, yeniKanalPermVeri).catch(console.error);
          }, index*5000);
        });
      }, 5000);

      let roleMembers = roleData.members;
      roleMembers.forEach((member, index) => {
        let uye = message.guild.members.cache.get(member);
        if (!uye || uye.roles.cache.has(yeniRol.id)) return;
        setTimeout(() => {
          uye.roles.add(yeniRol.id).catch(console.error);
        }, index*3000);
      });

      let logKanali = client.channels.cache.get(ayarlar.logChannelID);
      if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Yedeği Kullanıldı!').setDescription(`${message.author} (${message.author.id}) tarafından **${roleData.name} (${roleData.roleID})** rolünün yedeği kurulmaya başlandı! Rol tekrar oluşturularak, üyelerine dağıtılmaya ve izinleri kanallara eklenmeye başlanıyor.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { message.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Yedeği Kullanıldı!').setDescription(`${message.author} (${message.author.id}) tarafından **${roleData.name} (${roleData.roleID})** rolünün yedeği kurulmaya başlandı! Rol tekrar oluşturularak, üyelerine dağıtılmaya ve izinleri kanallara eklenmeye başlanıyor.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
    });
  };
});


function guvenli(kisiID) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  let guvenliler = ayarlar.whitelist || [];
  if (!uye || uye.id === client.user.id || uye.id === ayarlar.botOwner || uye.id === uye.guild.owner.id || guvenliler.some(g => uye.id === g.slice(1) || uye.roles.cache.has(g.slice(1)))) return true
  else return false;
};


const yetkiPermleri = ["ADMINISTRATOR", "MANAGE_ROLES", "MANAGE_CHANNELS", "MANAGE_GUILD", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_NICKNAMES", "MANAGE_EMOJIS", "MANAGE_WEBHOOKS"];
function cezalandir(kisiID, tur) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  if (!uye) return;
  if (tur == "jail") return uye.roles.cache.has(ayarlar.boosterRole) ? uye.roles.set([ayarlar.boosterRole, ayarlar.jailRole]) : uye.roles.set([ayarlar.jailRole]);
  if (tur == "ban") return uye.ban({ reason: "shina Koruma" }).catch();
};

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.roles.cache.size > oldMember.roles.cache.size) {
    let entry = await newMember.guild.fetchAuditLogs({type: 'MEMBER_ROLE_UPDATE'}).then(audit => audit.entries.first());
    if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
    if (yetkiPermleri.some(p => !oldMember.hasPermission(p) && newMember.hasPermission(p))) {
      cezalandir(entry.executor.id, "ban");
      newMember.roles.set(oldMember.roles.cache.map(r => r.id));
      let logKanali = client.channels.cache.get(ayarlar.logChannelID);
      if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Sağ Tık Yetki Verildi!').setDescription(`${newMember} (${newMember.id}) üyesine ${entry.executor} (${entry.executor.id}) tarafından sağ tık yetki verildi! Veren kişi yasaklandı ve verilen kişiden rol geri alındı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { newMember.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Sağ Tık Yetki Verildi!').setDescription(`${newMember} (${newMember.id}) üyesine ${entry.executor} (${entry.executor.id}) tarafından sağ tık yetki verildi! Veren kişi yasaklandı ve verilen kişiden rol geri alındı.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
    };
  };
});

client.on("roleCreate", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  role.delete({ reason: "shina Rol Koruma" });
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Oluşturuldu!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından bir rol oluşturuldu! Oluşturan kişi jaile atıldı ve rol silindi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { role.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Oluşturuldu!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından bir rol oluşturuldu! Oluşturan kişi jaile atıldı ve rol silindi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("roleUpdate", async (oldRole, newRole) => {
  let entry = await newRole.guild.fetchAuditLogs({type: 'ROLE_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newRole.guild.roles.cache.has(newRole.id) || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  cezalandir(entry.executor.id, "jail");
  if (yetkiPermleri.some(p => !oldRole.permissions.has(p) && newRole.permissions.has(p))) {
    newRole.setPermissions(oldRole.permissions);
    newRole.guild.roles.cache.filter(r => !r.managed && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_GUILD"))).forEach(r => r.setPermissions(36818497));
  };
  newRole.edit({
    name: oldRole.name,
    color: oldRole.hexColor,
    hoist: oldRole.hoist,
    permissions: oldRole.permissions,
    mentionable: oldRole.mentionable
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Güncellendi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${oldRole.name}** rolü güncellendi! Güncelleyen kişi jaile atıldı ve rol eski haline getirildi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { newRole.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Güncellendi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${oldRole.name}** rolü güncellendi! Güncelleyen kişi jaile atıldı ve rol eski haline getirildi.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});

client.on("roleDelete", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  cezalandir(entry.executor.id, "ban");
  let yeniRol = await role.guild.roles.create({
    data: {
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions,
      mentionable: role.mentionable
    },
    reason: "Rol Silindiği İçin Tekrar Oluşturuldu!"
  });

  Database.findOne({guildID: role.guild.id, roleID: role.id}, async (err, roleData) => {
    if (!roleData) return;
    setTimeout(() => {
      let kanalPermVeri = roleData.channelOverwrites;
      if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
        let kanal = role.guild.channels.cache.get(perm.id);
        if (!kanal) return;
        setTimeout(() => {
          let yeniKanalPermVeri = {};
          perm.allow.forEach(p => {
            yeniKanalPermVeri[p] = true;
          });
          perm.deny.forEach(p => {
            yeniKanalPermVeri[p] = false;
          });
          kanal.createOverwrite(yeniRol, yeniKanalPermVeri).catch(console.error);
        }, index*5000);
      });
    }, 5000);

    let roleMembers = roleData.members;
    roleMembers.forEach((member, index) => {
      let uye = role.guild.members.cache.get(member);
      if (!uye || uye.roles.cache.has(yeniRol.id)) return;
      setTimeout(() => {
        uye.roles.add(yeniRol.id).catch();
      }, index*3000);
    });
  });

  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Silindi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${role.name} (${role.id})** rolü silindi, silen kişi banlandı! Rol tekrar oluşturuldu, üyelerine dağıtılmaya ve izinleri kanallara eklenmeye başlanıyor.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { role.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('Rol Silindi!').setDescription(`${entry.executor} (${entry.executor.id}) tarafından **${role.name} (${role.id})** rolü silindi, silen kişi banlandı! Rol tekrar oluşturuldu, üyelerine dağıtılmaya ve izinleri kanallara eklenmeye başlanıyor.`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
});


function setRoleBackup() {
  let guild = client.guilds.cache.get(ayarlar.guildID);
  if (guild) {
    guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).forEach(role => {
      let roleChannelOverwrites = [];
      guild.channels.cache.filter(c => c.permissionOverwrites.has(role.id)).forEach(c => {
        let channelPerm = c.permissionOverwrites.get(role.id);
        let pushlanacak = { id: c.id, allow: channelPerm.allow.toArray(), deny: channelPerm.deny.toArray() };
        roleChannelOverwrites.push(pushlanacak);
      });

      Database.findOne({guildID: ayarlar.guildID, roleID: role.id}, async (err, savedRole) => {
        if (!savedRole) {
          let newRoleSchema = new Database({
            _id: new mongoose.Types.ObjectId(),
            guildID: ayarlar.guildID,
            roleID: role.id,
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions,
            mentionable: role.mentionable,
            time: Date.now(),
            members: role.members.map(m => m.id),
            channelOverwrites: roleChannelOverwrites
          });
          newRoleSchema.save();
        } else {
          savedRole.name = role.name;
          savedRole.color = role.hexColor;
          savedRole.hoist = role.hoist;
          savedRole.position = role.position;
          savedRole.permissions = role.permissions;
          savedRole.mentionable = role.mentionable;
          savedRole.time = Date.now();
          savedRole.members = role.members.map(m => m.id);
          savedRole.channelOverwrites = roleChannelOverwrites;
          savedRole.save();
        };
      });
    });

    Database.find({guildID: ayarlar.guildID}).sort().exec((err, roles) => {
      roles.filter(r => !guild.roles.cache.has(r.roleID) && Date.now()-r.time > 1000*60*60*24*3).forEach(r => {//1 saatte bir alır. Süreyi değiştirebilirsiinz.
        Database.findOneAndDelete({roleID: r.roleID});
      });
    });
    console.log(`Rol veri tabanı düzenlendi!`);
  };
};

function ytKapat(guildID) {
  let sunucu = client.guilds.cache.get(guildID);
  if (!sunucu) return;
  sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_WEBHOOKS"))).forEach(async r => {
    await r.setPermissions(0);
  });

  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("RANDOM").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("RANDOM").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "shina"} was here!`).setTimestamp()).catch(err => {}); };
};
client.login(ayarlar.botToken).then(c => console.log(`${client.user.tag} olarak giriş yapıldı!`)).catch(err => console.error("Bota giriş yapılırken başarısız olundu!"));
