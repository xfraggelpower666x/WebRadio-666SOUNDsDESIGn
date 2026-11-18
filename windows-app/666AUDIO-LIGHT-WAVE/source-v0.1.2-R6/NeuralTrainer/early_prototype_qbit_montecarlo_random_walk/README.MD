The following files are a selection of legacy prototypes that were experimentations of QBITS 
from Quantum fluctuations (the user had over 5 million stored from their experimentations from 2014-2017) 
from Quantum computing - Physics @ ANU public interface, user in their php + mysql things... 
alongside with some montecarlo random walks, which combined led to the dataset used in 
current NeuralTrainer as base.

Included are also some c (cuda) prototypes of random-walking eurojackpot universe 
(there is visible pattern inherent if one but see...) and php front-end that were 
also basis for the birth of Light Wave Tech with their
ideas of deep structures (holofractographic) and emergence of intelligence.

Old MYSQL for quantum_bits were as follows, these were used partly in the
Light Wave Tech Monte Carlo Seed for Neural Indices for which NeuralTrainer
is developed for further experimentations...

CREATE TABLE `quantum_bit_pool`
(
  `id` INT(20) NOT NULL auto_increment,
  `date` TIMESTAMP DEFAULT NOW(),
  `date_used` TIMESTAMP DEFAULT '0000-00-00 00:00:00',
  `qbit` VARBINARY(24) default NULL,
  `state` VARBINARY(1) default '1',
  PRIMARY KEY (`id`),
  KEY `date_idx` (`date`),
  KEY `date_used_idx` (`date_used`),
  KEY `qbit_idx` (`qbit`),
  KEY `state_idx` (`state`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE `quantum_bit_stats` 
(
  `id` INT(20) NOT NULL auto_increment,
  `date` TIMESTAMP DEFAULT NOW(),
  `num_zero` INT(8) default '0',
  `num_one` INT(8) default '0',
  `percentage_zero` DOUBLE,
  `percentage_one` DOUBLE,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
