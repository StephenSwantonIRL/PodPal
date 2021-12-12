create table Admin( 
id int auto_increment not null primary key, 
fName varchar(32) not null, 
lName varchar(32) not null, 
email varchar(50) not null unique, 
password varchar(64) not null, 
pushAlertId varchar(10) not null
);

create table Device( 
MACaddress varchar(19) not null primary key, 
Type varchar(20), 
ownedBy int(12) not null,
Constraint fk_ownedBy Foreign Key (ownedBy) references Admin(id) on update cascade on delete cascade
);

Create table Employee(
id int auto_increment not null primary key, 
fName varchar(32) not null, 
lName varchar(32) not null, 
email varchar(50) not null unique, 
password varchar(64) not null, 
barcodeId varchar(64) not null, 
credits int, 
accountAdmin int not null, 
constraint fk_accountAdmin Foreign Key (accountAdmin) references Admin(id)
);

create table Booking(
id int auto_increment not null primary key, 
startTime DATETIME not null, 
duration int not null, 
bookedBy int not null, 
deviceUsed varchar(19) not null,
constraint fk_bookedBy Foreign Key (bookedBy) references Employee(id),
constraint fk_deviseUsed Foreign Key (deviceUsed) references Device(MACaddress) 
);


