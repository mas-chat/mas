-- MySQL dump 10.11
--
-- Host: localhost    Database: milhouse
-- ------------------------------------------------------
-- Server version	5.0.95

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `milhouse`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `milhouse` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `milhouse`;

--
-- Table structure for table `anonusers`
--

DROP TABLE IF EXISTS `anonusers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `anonusers` (
  `nick` varchar(15) NOT NULL,
  `userid` int(10) unsigned NOT NULL,
  `IP` varchar(15) NOT NULL,
  KEY `nick` (`nick`,`userid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bans`
--

DROP TABLE IF EXISTS `bans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bans` (
  `group` varchar(30) NOT NULL,
  `bannerid` mediumint(8) unsigned NOT NULL,
  `bannedid` mediumint(8) unsigned NOT NULL,
  `bannedIP` varchar(15) NOT NULL,
  `reason` varchar(100) NOT NULL,
  `time` timestamp NOT NULL default CURRENT_TIMESTAMP,
  `banid` int(10) unsigned NOT NULL auto_increment,
  PRIMARY KEY  (`banid`),
  KEY `groupid` (`group`,`bannedIP`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `channels`
--

DROP TABLE IF EXISTS `channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `channels` (
  `id` mediumint(8) unsigned NOT NULL auto_increment,
  `name` varchar(32) character set utf8 collate utf8_unicode_ci NOT NULL,
  `userid` mediumint(8) unsigned NOT NULL,
  `x` smallint(5) unsigned NOT NULL,
  `y` smallint(5) unsigned NOT NULL,
  `width` smallint(5) unsigned NOT NULL,
  `height` smallint(5) unsigned NOT NULL,
  `network` smallint(5) unsigned NOT NULL,
  `type` tinyint(3) unsigned NOT NULL,
  `sound` tinyint(4) NOT NULL,
  `password` varchar(15) character set utf8 collate utf8_unicode_ci NOT NULL,
  `titlealert` tinyint(4) NOT NULL,
  `hidden` tinyint(4) NOT NULL,
  `urls` mediumtext character set utf8 collate utf8_unicode_ci NOT NULL,
  `notes` varchar(15000) character set utf8 collate utf8_unicode_ci NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=24327 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contactreqs`
--

DROP TABLE IF EXISTS `contactreqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contactreqs` (
  `initiator` int(11) NOT NULL,
  `target` int(11) NOT NULL,
  KEY `from` (`initiator`,`target`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups` (
  `name` varbinary(30) NOT NULL,
  `owner` int(10) unsigned NOT NULL,
  `password` varbinary(25) NOT NULL,
  `apikey` varchar(25) NOT NULL,
  PRIMARY KEY  (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invites`
--

DROP TABLE IF EXISTS `invites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invites` (
  `token` varchar(100) NOT NULL,
  `amount` mediumint(9) NOT NULL default '1',
  `released` tinyint(1) NOT NULL default '0',
  PRIMARY KEY  (`token`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `newcontacts`
--

DROP TABLE IF EXISTS `newcontacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `newcontacts` (
  `userid` int(10) unsigned NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `opers`
--

DROP TABLE IF EXISTS `opers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `opers` (
  `userid` int(10) unsigned NOT NULL,
  `group` varchar(30) NOT NULL,
  KEY `userid` (`userid`,`group`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `firstname` varbinary(100) NOT NULL,
  `lastname` varbinary(100) NOT NULL,
  `email` varchar(30) character set latin1 NOT NULL,
  `inuse` tinyint(1) NOT NULL default '0',
  `userid` int(11) unsigned NOT NULL auto_increment,
  `lastlogin` datetime NOT NULL,
  `passwd` binary(64) default NULL,
  `nick` varchar(15) character set latin1 NOT NULL,
  `gender` tinyint(4) NOT NULL,
  `token` varchar(50) character set latin1 NOT NULL,
  `cookie` varchar(100) character set latin1 NOT NULL,
  `cookie_expires` int(10) unsigned NOT NULL,
  `friends` varchar(30000) character set latin1 NOT NULL default ':',
  `unfriends` varchar(30000) character set latin1 NOT NULL default ':',
  `country` varchar(75) character set latin1 NOT NULL,
  `hasinvite` tinyint(1) NOT NULL,
  `settings` varbinary(2000) NOT NULL,
  `lastip` varchar(15) character set latin1 NOT NULL,
  `server` mediumint(8) unsigned NOT NULL default '1',
  `ads` tinyint(4) NOT NULL default '1',
  `maxwindows` tinyint(3) unsigned NOT NULL default '5',
  `openidurl` varchar(255) NOT NULL,
  `registrationtime` datetime NOT NULL default '1000-01-01 00:00:00',
  PRIMARY KEY  (`userid`)
) ENGINE=InnoDB AUTO_INCREMENT=5113 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2013-10-21 18:50:50
