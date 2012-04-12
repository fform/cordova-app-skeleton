<?php

class Controller_Api extends Controller_Rest
{
	public function before(){
		parent::before();

		//This allows testing across domains for local app development running off the
		//Proto server
		$this->response->set_header('Access-Control-Allow-Origin', '*');
	}

	public function get_list(){
		// Called with http://domain.com/api/list.json
		$this->response(array(
			'foo' => 'bar',
			'my_list' => array(1,2,3)
		));
	}

	public function post_addsomething(){
		if(Fuel::$env == Fuel::PRODUCTION){
			// Do something only in production
		}

		$player_name = trim(Input::post('name'));
		$player_email = trim(strtolower(Input::post('email')));

		if(true){
			$this->response(array(
				'your_name' => $player_name,
				'your_email' => $player_email
			), 200);
		}else{
			$this->response(array(
			'msg' => "Bad response",
			'your_email' => $player_email
		), 200);
		}
		
	}


}
