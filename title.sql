insert or replace into titles ( title_id, title_name, bgg ) values ( 'hammer-of-the-scots', 'Hammer of the Scots', 3685 );
insert or ignore into setups ( title_id, player_count, scenario, options ) values
	( 'hammer-of-the-scots', 2, 'Braveheart', '{"delay_hits":true}' ),
	( 'hammer-of-the-scots', 2, 'The Bruce', '{"delay_hits":true}' )
;
